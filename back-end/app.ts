
import express from "express";
import cors from "cors";
import routes from "./routes/routes";


const app = express();


// Enable CORS for the front-end origin
app.use(cors({
	origin: "http://localhost:5173",
	credentials: true
}));

app.use(express.json());

app.use(routes);

export default app;
