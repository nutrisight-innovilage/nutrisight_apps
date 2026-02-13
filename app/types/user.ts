// app/types/user.ts

export type Gender = "male" | "female";
export type UserRole = "ibu hamil" | "anak anak" | "remaja" | "dewasa" | "lansia";

export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: Gender;
  role: UserRole;
  phone?: string;
  updatedAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string; // Tambahkan ini karena digunakan di authOnlineAPI
}

export interface LoginRequest {
  email: string;
  password: string;
}
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  age: string;
  weight: string;
  height: string;
  gender: Gender;
  role: UserRole;
  phone?: string; // Tambahkan ini
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: Gender;
  role?: UserRole;
  updatedAt?: string;
}