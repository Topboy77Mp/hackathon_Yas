import { setAuthToken } from "./authToken";
import { apiClient } from "./apiClient";
import { USE_MOCKS } from "./config";

type LoginPayload = {
  token: string;
  user: { role: string };
};

export async function loginMerchant(phone: string, password: string): Promise<void> {
  if (USE_MOCKS) {
    setAuthToken("demo-session");
    return;
  }

  const response = await apiClient<LoginPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

  if (response.user.role !== "MERCHANT") {
    throw new Error("Ce compte ne possède pas un accès commerçant.");
  }

  setAuthToken(response.token);
}
