import express from "express";

const SERVICE_NAME = "booking";
const PORT = process.env.PORT || 4003;

const app = express();
app.use(express.json());

app.get("/health", (req,res) => {
    res.json({ status: "ok", service: SERVICE_NAME });
});

app.listen(PORT, () => {
    console.log(`${SERVICE_NAME} bezi, port: ${PORT}`);
});