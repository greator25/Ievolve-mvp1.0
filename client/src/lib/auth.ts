import { apiRequest } from "./queryClient";
import type { User } from "./types";

export interface LoginResponse {
  user: User;
}

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  const response = await apiRequest("POST", "/api/auth/admin/login", { email, password });
  return await response.json();
}

export async function requestOTP(mobileNumber: string): Promise<{ message: string }> {
  const response = await apiRequest("POST", "/api/auth/coach/request-otp", { mobileNumber });
  return await response.json();
}

export async function verifyOTP(mobileNumber: string, otp: string): Promise<LoginResponse> {
  const response = await apiRequest("POST", "/api/auth/coach/verify-otp", { mobileNumber, otp });
  return await response.json();
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
}

export async function getCurrentUser(): Promise<LoginResponse | null> {
  try {
    const response = await apiRequest("GET", "/api/auth/me");
    return await response.json();
  } catch (error) {
    return null;
  }
}
