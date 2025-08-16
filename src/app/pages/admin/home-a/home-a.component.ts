import { AfterViewInit, Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home-a',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, InputTextModule, FormsModule, DropdownModule, MessageModule, MessagesModule],
  templateUrl: './home-a.component.html',
  styleUrls: ['./home-a.component.css']
})
export class HomeAComponent implements AfterViewInit, OnInit, OnDestroy {
  datos: any[] = [];
  data: any[] = [];
  gridData: any[] = [];
  showModal = false;
  us: string = '';
  messages: any[] = [];

  map: any;
  markers: any[] = [];
  routes: any[] = [];
  customIcon: any;
  L: any;

  ubicaciones: any[] = [];
  
  form = {
    delivery_address: '',
    delivery_lat: null as number | null,
    delivery_lng: null as number | null,
    id: null as number | null,
    status: null,
  };

  userOptions: { label: string; value: string }[] = [];

  tipoStatus = [
    { label: 'En transito', value: 'En transito' },
    { label: 'Entregado', value: 'Entregado' },
    { label: 'Regresado', value: 'Regresado' }
  ];

  private socketSubscription: Subscription | null = null;
  private userColors: {[userId: string]: string} = {};
  private currentUserId: number | null = 1;
  private watchId: number | null = null;

  constructor(private service: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadLocations();

    this.socketSubscription = this.service.listenToLocationsStream().subscribe({
    next: (data: any[]) => {
        if (this.map) {
        this.updateMarkers(data);
        this.updateRoutes(data); 
        this.gridData = [...data]; 
        console.log('Datos recibidos del socket:', data);
        } else {
        this.ubicaciones = data;
        }
    },
    error: (err) => console.error('Error en socket:', err)
    });
  }

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      import('leaflet').then(L => {
        this.L = L;
        this.customIcon = this.L.icon({
          iconUrl: 'https://res.cloudinary.com/ddfc17kwj/image/upload/v1754577392/icono_1_bpeooy.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        this.map = this.L.map('map').setView([20.65636, -100.40507], 16);

        this.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors',
        }).addTo(this.map);
        
        if (this.ubicaciones.length) {
          this.updateMarkers(this.ubicaciones);
          this.updateRoutes(this.ubicaciones);
        }
      });
    }
  }

  loadLocations() {
    this.service.getLocation().subscribe({
      next: (locations: any[]) => {
        this.ubicaciones = locations;
        this.gridData = locations;
        if (this.map) {
          this.updateMarkers(this.ubicaciones);
          this.updateRoutes(this.ubicaciones);
        }
      },
      error: (err) => {
        console.error('Error al obtener ubicación inicial:', err);
      }
    });
  }

  loadUsers() {
    this.service.getUsersDelivery().subscribe({
      next: (response: any[]) => {
        this.us = response.map(user => user.username).join(', ');
        this.userOptions = response.map(user => ({
          label: user.username,
          value: user.id
        }));
      },
      error: (err) => {
        console.error('Error al obtener usuarios de delivery:', err);
      }
    });
  }
  
  submitForm() {
    if (!this.form.delivery_address || this.form.delivery_lat === null || this.form.delivery_lng === null || !this.form.id || !this.form.status) {
      this.messages = [{
        severity: 'info',
        summary: 'Error',
        detail: 'Falta completar todos los campos'
      }];
      return;
    }

    const packageData = {
      delivery_address: this.form.delivery_address,
      delivery_lat: this.form.delivery_lat,
      delivery_lng: this.form.delivery_lng,
      assigned_to: this.form.id,
      status: this.form.status,
      created_at: new Date().toISOString()
    };

    this.service.addPackage(packageData).subscribe({
      next: (res) => {
        this.messages = [{
          severity: 'success',
          summary: 'Éxito',
          detail: 'Paquete asignado correctamente'
        }];
        this.resetForm();
        setTimeout(() => {
          this.showModal = false;
          this.messages = [];
        }, 4000);
        this.loadLocations();
      },
      error: (err) => {
        console.error('Error al agregar paquete:', err);
        alert('Error al agregar paquete. Revisa la consola para más detalles.');
      }
    });
  }

  resetForm() {
    this.form.delivery_address = '';
    this.form.delivery_lat = null;
    this.form.delivery_lng = null;
    this.form.id = null;
    this.form.status = null;
  }

  /**
   * 💡 Optimizado: Actualiza los marcadores de los repartidores.
   */
  updateMarkers(locations: any[]) {
    if (!this.map || !this.L) return;

    locations.forEach(loc => {
      const lat = parseFloat(loc.last_lat);
      const lng = parseFloat(loc.last_lng);
      if (isNaN(lat) || isNaN(lng)) return;

      let existingMarker = this.markers.find(m => (m as any).userId === loc.user_id);
      
      if (existingMarker) {
        // Mover el marcador existente
        existingMarker.setLatLng([lat, lng]);
        existingMarker.setPopupContent(`${loc.username} - ${loc.status}`);
      } else {
        // Crear un nuevo marcador si no existe
        const newMarker = this.L.marker([lat, lng], { icon: this.customIcon })
          .addTo(this.map)
          .bindPopup(`${loc.username} - ${loc.status}`);
        (newMarker as any).userId = loc.user_id;
        this.markers.push(newMarker);
      }
    });
  }
  
  /**
   * 💡 Nueva función: Actualiza las rutas para cada repartidor.
   */
  updateRoutes(locations: any[]) {
    if (!this.map || !this.L) return;

    // Remover todas las rutas existentes
    this.routes.forEach(route => this.map.removeLayer(route));
    this.routes = [];

    // Asumimos que `locations` tiene el historial de ubicaciones para un solo repartidor
    // Si el backend envía solo la última ubicación, esta lógica no dibujará una línea,
    // pero está lista para un historial si lo necesitas.
    const ubicacionesPorUsuario: { [userId: string]: any[] } = {};
    locations.forEach(loc => {
      if (!ubicacionesPorUsuario[loc.user_id]) {
        ubicacionesPorUsuario[loc.user_id] = [];
      }
      ubicacionesPorUsuario[loc.user_id].push([parseFloat(loc.last_lat), parseFloat(loc.last_lng)]);
    });

    for (const userId in ubicacionesPorUsuario) {
      if (ubicacionesPorUsuario[userId].length > 1) {
        const polyline = this.L.polyline(ubicacionesPorUsuario[userId], { color: this.getColorForUser(userId) }).addTo(this.map);
        this.routes.push(polyline);
      }
    }
  }


  private getColorForUser(userId: string): string {
    if (!this.userColors[userId]) {
      this.userColors[userId] = this.getRandomColor();
    }
    return this.userColors[userId];
  }

  private getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }

  ngOnDestroy(): void {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }
}