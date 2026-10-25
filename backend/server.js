import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";
import dns from "dns";
import setupRoutes from "./routes/setupRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import attendanceCorrectionRoutes from "./routes/attendanceCorrectionRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json())
const allowedOrigins = [
  "http://localhost:5173",
  "https://fullstack-eta-ten.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

mongoose.connect(process.env.MONGODB_URL)
.then(()=>{
    console.log('mongodb connected');
}).catch((error)=>{
    console.log("error in mongodb connection")
    console.error(error)
})


app.use("/api/setup", setupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use(
  "/api/attendance-corrections",
  attendanceCorrectionRoutes
);
app.use("/api/announcements", announcementRoutes);
app.use("/api/ai", aiRoutes);

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Please provide a message"
      });
    }

    const { GoogleGenAI } = await import("@google/genai");

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message
    });

    res.json({
      reply: response.text
    });
  } catch (error) {
    console.error("Gemini error:", error.message);

    res.status(500).json({
      message: "Failed to generate AI response"
    });
  }
});


app.listen(port,() => {
    console.log("port is running");
})


/// connect cloudinary account 
/// check the react and express data flow push the code on github and 
/// deploy the front and back end 