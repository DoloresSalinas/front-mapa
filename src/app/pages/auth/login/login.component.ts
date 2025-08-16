import { Component } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CardModule,
    MessageModule,
    MessagesModule
  ],
  providers: [ApiService],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  userId = 0;
  username: string = '';
  password: string = '';
  messages: any[] = [];
  rol: string = '';

  constructor(private service: ApiService, private router: Router) {}

  login() {
    if (!this.username || !this.password) {
      this.messages = [{
        severity: 'warn',
        summary: 'Campos incompletos',
        detail: 'Por favor ingresa usuario y contraseña.'
      }];
      return;
    }

    console.log('Enviando login con:', this.username, this.password);

    this.service.getUserLogin(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Datos recibidos:', response);

        const { id, username } = response;

        if (!id || !username) {
          this.messages = [{
            severity: 'error',
            summary: 'Error',
            detail: 'Respuesta inválida del servidor.'
          }];
          return;
        }

        localStorage.setItem('userId', id.toString()); 
        localStorage.setItem('currentUser', JSON.stringify(response));
console.log('Usuario guardado en localStorage:', response);
        this.messages = [{ severity: 'success', summary: 'Login exitoso' }];

        if (username === 'admin') {
          this.router.navigate(['/admin', id]);
        } else {
          this.router.navigate(['/delivery', id]);
        }
      },
      error: (err) => {
        console.error('Error en login:', err);
        this.messages = [{
          severity: 'error',
          summary: 'Error',
          detail: 'Usuario o contraseña incorrectos.'
        }];
      }
    });
  }
}
