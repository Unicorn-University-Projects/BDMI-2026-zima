import app, { SERVICE_NAME } from "./app.js";

const PORT = process.env.PORT || 4005;

app.listen(PORT, (error) => {
  if (error) throw error;
  console.log(`${SERVICE_NAME} bezi, port: ${PORT}`);
});
