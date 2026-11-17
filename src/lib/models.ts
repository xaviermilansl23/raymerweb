export interface Cliente {
  cliente_id: number;
  nombre: string;
  correo: string;
  usuario: string;
  telefono?: string;
  email_verificado?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  cliente: Cliente;
}

export interface Producto {
  producto_id: number;
  nombre: string;
  descripcion: string | null;
  marca?: string | null;
  modelo?: string | null;
  imagen_url: string | null;
  imagenes?: (string | null)[] | null;
  tipo_producto_id: number | null;
  tipo_producto_nombre: string | null;
  precio_venta: number;
  stock_disponible: number;
}

export interface Categoria {
  tipo_producto_id: number;
  nombre: string;
  descripcion: string | null;
  estado: string;
}
