import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import api from "./routes/index.js";
const app=express();
app.use(helmet());
app.use(cors({
  origin: "https://regenta-fc.vercel.app",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({limit:"1mb"}));
app.use("/api/auth",rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:true,legacyHeaders:false}));
app.get("/health",(_req,res)=>res.json({status:"ok",service:"regenta-anniversary-backend"}));
app.use("/api",api);
app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
 console.error(err);res.status(500).json({error:"Internal server error"});
});
export default app;
