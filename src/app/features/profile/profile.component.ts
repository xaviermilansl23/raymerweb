import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { Cliente } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly baseApi = environment.apiUrl.replace(/\/$/, '');
  readonly profile = signal<Cliente | null>(null);
  readonly loading = signal(true);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly profileMessage = signal('');
  readonly profileError = signal('');
  readonly passwordMessage = signal('');
  readonly passwordError = signal('');

  readonly profileForm = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    usuario: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+$/)] }),
    telefono: new FormControl('', { nonNullable: true }),
  });
  readonly passwordForm = new FormGroup({
    actual: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nueva: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmar: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  constructor() { this.loadProfile(); }

  loadProfile(): void {
    this.loading.set(true);
    this.auth.profile().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.profileForm.patchValue({ nombre: profile.nombre, correo: profile.correo, usuario: profile.usuario, telefono: profile.telefono ?? '' });
      },
      error: (error) => this.profileError.set(apiErrorMessage(error, 'No se pudo cargar tu perfil')),
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.savingProfile.set(true);
    this.profileError.set(''); this.profileMessage.set('');
    this.http.put<{ perfil: Cliente }>(`${this.baseApi}/mobile/clientes/perfil`, this.profileForm.getRawValue())
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (response) => { this.profile.set(response.perfil); this.profileMessage.set('Tus datos se actualizaron correctamente.'); },
        error: (error) => this.profileError.set(apiErrorMessage(error, 'No se pudieron guardar tus datos')),
      });
  }

  savePassword(): void {
    const value = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid || value.nueva !== value.confirmar) {
      this.passwordForm.markAllAsTouched();
      if (value.nueva !== value.confirmar) this.passwordError.set('La confirmación no coincide.');
      return;
    }
    this.savingPassword.set(true);
    this.passwordError.set(''); this.passwordMessage.set('');
    this.http.put(`${this.baseApi}/mobile/clientes/perfil/password`, value)
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: () => { this.passwordMessage.set('Tu contraseña se actualizó correctamente.'); this.passwordForm.reset(); },
        error: (error) => this.passwordError.set(apiErrorMessage(error, 'No se pudo cambiar la contraseña')),
      });
  }

  initials(): string {
    return (this.profile()?.nombre ?? 'R').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }
}
