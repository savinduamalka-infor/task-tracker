import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTaskStore } from "@/lib/task-store";
import { ClipboardList } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setCurrentUser, currentUser } = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "1") {
      toast({
        title: "Session Expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  useEffect(() => {
    if (currentUser.id) {
      navigate("/", { replace: true });
    }
  }, [currentUser.id, navigate]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/sign-in/email`,
        {
          email: data.email,
          password: data.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      if (response.data?.user) {
        // Store session token for cross-domain auth (cookie won't work
        // between vercel.app and onrender.com)
        if (response.data.session?.token) {
          localStorage.setItem("session_token", response.data.session.token);
        }

        const userData = {
          _id: response.data.user.id,
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          role: response.data.user.role,
          teamId: response.data.user.teamId || "",
          jobTitle: response.data.user.jobTitle || "",
          isActive: response.data.user.isActive,
          lastUpdateSubmitted: response.data.user.lastUpdateSubmitted || null,
          avatar: response.data.user.image,
        };
        
        setCurrentUser(userData);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${response.data.user.name}!`,
        });
        // Redirect to home — the dashboard handles team/no-team states
        navigate("/");
        //navigate("/")
      }
    } catch (error) {
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to log in. Please check your credentials.";
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <ClipboardList className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Task Tracker</span>
        </div>
        <Card>
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to log in</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
                          type="password"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
