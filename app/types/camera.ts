export type CameraFacing = 'back' | 'front';

export interface CapturedPhoto {
  uri: string;
  width?: number;
  height?: number;
  base64?: string;
}

export interface PhotoOptions {
  quality?: number;
  base64?: boolean;
}

export interface PickImageOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}