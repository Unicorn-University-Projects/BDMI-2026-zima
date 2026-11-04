import express from "express";
import userController from "./controllers/user-controller.js";

const SERVICE_NAME = "auth";
const PORT = process.env.PORT || 4001;

const app = express();
app.use(express.json());

app.get("/health", (req,res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
});

app.use("/user", userController);

app.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`${SERVICE_NAME} bezi, port: ${PORT}`);
});