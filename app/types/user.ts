export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  role: string;
  phone?: string
  updatedAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
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
  gender: string;
  role: string;
}