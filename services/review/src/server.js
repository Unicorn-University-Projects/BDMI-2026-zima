import express from "express";

const SERVICE_NAME = "review";
const PORT = process.env.PORT || 4004;

const app = express();
app.use(express.json());

app.get("/health", (req,res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
});

app.listen(PORT, () => {
    console.log(`${SERVICE_NAME} bezi, port: ${PORT}`);
});