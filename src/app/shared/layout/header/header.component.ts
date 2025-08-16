// header.component.ts
import { Component, signal, OnInit, Inject, PLATFORM_ID } from '@angular/core'; 
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ApiService } from '../../../services/api.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MenubarModule]
})
export class HeaderComponent implements OnInit {
  isAuthenticated = signal(false);
  
  constructor(
    private router: Router,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const id = localStorage.getItem('userId'); 
      if (id) {
        this.isAuthenticated.set(true);
      }
    }
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.performLogout();
      return;
    }
    
    const userIdStr = localStorage.getItem('userId');
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;

    if (!userId) {
      console.error('Error: El userId no está disponible para actualizar el estado.');
      this.performLogout();
      return;
    }

    console.log(`Intentando actualizar el estado del repartidor con ID: ${userId} a 'off'`);
    
    this.apiService.updateDeliveryStatus(userId, 'off').pipe(
        finalize(() => {
            this.performLogout();
        })
    ).subscribe({
        next: () => {
            console.log(`Estado del repartidor ${userId} actualizado a 'off' con éxito`);
        },
        error: (err) => {
            console.error('Error al actualizar el estado:', err);
        }
    });
  }

  private performLogout(): void {
    if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem('userId');
        localStorage.removeItem('currentUser');
    }
    this.isAuthenticated.set(false);
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // Si lo necesitas, puedes usar una función similar para el goToHome
  goToHome(): void {
    const id = isPlatformBrowser(this.platformId) ? localStorage.getItem('userId') : null;
    if (!id || !this.isAuthenticated()) {
      console.warn('Usuario no autenticado o ID vacío');
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/home-d']);
  }
}