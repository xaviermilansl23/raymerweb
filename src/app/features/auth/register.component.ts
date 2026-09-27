import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { safeReturnUrl, signInMessage } from '../../core/session-access.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  readonly reason = this.route.snapshot.queryParamMap.get('reason');
  readonly notice = signInMessage(this.reason);
  readonly authQueryParams = { returnUrl: this.returnUrl, reason: this.reason };
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);
  readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    usuario: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+$/)] }),
    telefono: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmar: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid || this.form.controls.password.value !== this.form.controls.confirmar.value) {
      this.form.markAllAsTouched();
      if (this.form.controls.password.value !== this.form.controls.confirmar.value) this.error.set('Las contraseñas no coinciden');
      return;
    }
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.auth.register({ nombre: value.nombre.trim(), correo: value.correo.trim(), usuario: value.usuario.trim(), telefono: value.telefono.trim() || undefined, password: value.password })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl(this.returnUrl),
        error: (error) => this.error.set(apiErrorMessage(error, 'No se pudo crear la cuenta')),
      });
  }
}
