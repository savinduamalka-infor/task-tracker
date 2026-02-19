import express from "express";
import routes from "./routes/routes";

const app = express();

app.use(express.json());
// if (process.env.NODE_ENV === "test") {
//   app.use((req: any, res, next) => {
//     req.user = {
//       id: "507f1f77bcf86cd799439011",
//       email: "admin@test.com",
//       role: "Admin",
//     };
//     next();
//   });
// }

app.use(routes);

export default app;
