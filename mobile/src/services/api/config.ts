import { Platform } from "react-native";

const PORT = 5100; // sende sabitlediğin port
const HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_BASE_URL = `http://${HOST}:${PORT}`;
