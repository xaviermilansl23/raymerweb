import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export interface ComboBanner {
  image: string;
  title: string;
  subtitle?: string;
  badge?: string;
  link?: string;
}

@Component({
  selector: 'app-combos',
  standalone: true,
  templateUrl: './combos.component.html',
  styleUrl: './combos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CombosComponent {
  // ⬇️ Agrega aquí tus banners (en orden de aparición).
  //    Coloca las imágenes en:  public/combos/
  readonly banners = signal<ComboBanner[]>([
    {
      image: 'combos/combos-1.png',
      title: 'Combo de Lanzamiento',
      subtitle: 'Sustituye esta imagen por la tuya y actualiza la ruta en combos.component.ts.',
      badge: 'Nuevo',
    },
    {
      image: 'combos/combos-2.png',
      title: 'Combo Promocional',
      subtitle: 'Este es el segundo banner de una sola columna.',
    },
  ]);

  private readonly failed = signal(new Set<number>());

  isFailed(index: number): boolean {
    return this.failed().has(index);
  }

  onImageError(index: number): void {
    this.failed.update((set) => new Set(set).add(index));
  }
}