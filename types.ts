export interface GeneratedImage {
  id: string;
  url: string; // base64 data URL
  prompt: string;
}

export interface Style {
  name: string;
  description: string;
  previewImage: string;
}

export interface BackgroundStyle {
  id: 'white-border' | 'transparent';
  name: string;
  previewImage: string;
}
