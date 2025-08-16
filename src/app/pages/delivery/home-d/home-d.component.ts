import { AfterViewInit, Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router'; // ⚠️ Added Router for potential navigation
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';

@Component({
  selector: 'app-home-d',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    FormsModule,
    DropdownModule,
    MessageModule,
    MessagesModule
  ],
  templateUrl: './home-d.component.html',
  styleUrls: ['./home-d.component.css']
})
export class HomeDComponent implements OnInit, AfterViewInit, OnDestroy {
  packages: any[] = [];
  currentLocation: any = null;
  messages: any[] = []; // ⚠️ Added for user feedback

  private packagesSubscription!: Subscription;
  private streamSubscription!: Subscription;

  private map: any;
  private L: any;
  private deliveryMarker: any; // Marcador del repartidor
  private packageMarkers: any[] = []; // Marcadores de paquetes

  private watchId: number | null = null;
  private userId!: number;

  tipoStatus = [
    { label: 'En transito', value: 'En transito' },
    { label: 'Entregado', value: 'Entregado' },
    { label: 'Regresado', value: 'Regresado' }
  ];

  constructor(private route: ActivatedRoute, private services: ApiService, private router: Router) {}

  ngOnInit() {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.userId || this.userId <= 0) {
      console.warn('User ID inválido o no proporcionado, redirigiendo a login.');
      this.router.navigate(['/login']);
      return;
    }

    this.loadPackages();

    // Iniciar el seguimiento de la ubicación del repartidor
    this.startGeolocationTracking();

    // Suscribirse al stream de ubicaciones
    this.streamSubscription = this.services.listenToLocationsStream().subscribe({
      next: (locations: any[]) => {
        const myLocation = locations.find(loc => loc.user_id === this.userId);
        if (myLocation) {
          this.currentLocation = myLocation;
          this.updateMapLocation(myLocation);
        }
      },
      error: (err) => console.error('Error en stream de ubicaciones:', err)
    });

    // Suscribirse a stream de nuevos paquetes
    this.services.listenToPackagesStream().subscribe({
      next: (newPackage: any) => {
        if (newPackage && newPackage.assigned_to === this.userId) {
          console.log("Nuevo paquete recibido en tiempo real:", newPackage);
          this.packages.push(newPackage);
          this.packages = [...this.packages];
          this.refreshPackageMarkers();
        }
      },
      error: (err) => console.error('Error en stream de paquetes:', err)
    });
  }

  ngAfterViewInit() {
    this.initializeMap();
  }

  ngOnDestroy() {
    if (this.packagesSubscription) this.packagesSubscription.unsubscribe();
    if (this.streamSubscription) this.streamSubscription.unsubscribe();
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

    // 💡 Nuevo método para iniciar el seguimiento de geolocalización
  private startGeolocationTracking(): void {
    if (!this.userId) {
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    // 💡 La función que actualiza la ubicación en el backend
    const updateLocation = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const status = 'working';
      
      this.services.updateDeliveryLocation(this.userId!, latitude, longitude, status).subscribe({
        next: (res) => {
          console.log('Ubicación enviada:', res);
        },
        error: (err) => {
          console.error('Error al enviar ubicación:', err);
        }
      });
    };

    // 💡 La función que maneja los errores
    const handleError = (error: GeolocationPositionError) => {
      console.error('Error al obtener la ubicación:', error);
    };

    // 💡 Inicia el seguimiento de la posición
    this.watchId = navigator.geolocation.watchPosition(updateLocation, handleError, options);
  }

  // Simulación de movimiento del repartidor
  iniciarMovimiento(pkg: any) {
    if (!this.userId) return;

    let latActual = 20.588793;
    let lngActual = -100.389888;

    const latDestino = pkg.delivery_lat;
    const lngDestino = pkg.delivery_lng;

    if (!this.isValidLatLng(latDestino, lngDestino)) {
      console.warn("Destino inválido para el paquete", pkg);
      return;
    }

    const pasos = 200;
    let pasoActual = 0;

    const latStep = (latDestino - latActual) / pasos;
    const lngStep = (lngDestino - lngActual) / pasos;

    const intervalo = setInterval(() => {
      latActual += latStep;
      lngActual += lngStep;
      pasoActual++;

      this.deliveryMarker.setLatLng([latActual, lngActual]);
      this.map.setView([latActual, lngActual], 14);
      this.deliveryMarker.bindPopup(`Repartidor<br>Estado: En transito`).openPopup();

      // Actualizar backend y emitir socket
      this.services.updateDeliveryLocation(this.userId, latActual, lngActual, 'En transito').subscribe({
        next: () => {
          console.log('Ubicación actualizada correctamente');
        },
        error: (err) => {
          console.error('Detalles del error al actualizar ubicación:', {
            error: err,
            userId: this.userId,
            lat: latActual,
            lng: lngActual
          });
          // Opcional: reintentar o mostrar mensaje al usuario
        }
      });

      if (pasoActual >= pasos) {
        clearInterval(intervalo);
        console.log(`Paquete ${pkg.id} entregado ✅`);
        this.updatePackageStatus(pkg.id, 'Entregado');
      }
    }, 500); // Actualiza cada 0.5 segundos
  }

  /**
   * Carga los paquetes asignados al repartidor.
   */
  private loadPackages(): void {
    this.packagesSubscription = this.services.getPackagesByUser(this.userId).subscribe({
      next: (packages) => {
        this.packages = packages;
        this.refreshPackageMarkers();
      },
      error: (err) => console.error('Error al cargar paquetes:', err)
    });
  }

  /**
   * Verifica si hay paquetes con estado 'En transito'.
   * @returns `true` si hay paquetes pendientes, `false` en caso contrario.
   */
  private hasPendingPackages(): boolean {
    return this.packages.some(p => p.status === 'En transito');
  }

  /**
   * Actualiza el estado de un paquete en el backend.
   * @param packageId El ID del paquete a actualizar.
   * @param newStatus El nuevo estado del paquete.
   */
  updatePackageStatus(packageId: number, newStatus: string) {
    this.services.updatePackageStatus(String(packageId), newStatus).subscribe({
      next: (updatedPackage) => {
        const idx = this.packages.findIndex(p => p.id === updatedPackage.id);
        if (idx !== -1) {
          this.packages[idx] = updatedPackage;
          this.packages = [...this.packages];
          this.refreshPackageMarkers();
        }
        
        // Actualizar el estado del repartidor después de cambiar el estado del paquete
        const newDeliveryStatus = this.hasPendingPackages() ? 'working' : 'off';
        this.services.updateDeliveryLocation(this.userId, this.currentLocation?.last_lat, this.currentLocation?.last_lng, newDeliveryStatus).subscribe({
          next: () => console.log(`Estado repartidor actualizado a ${newDeliveryStatus}`),
          error: (err) => console.error('Error al actualizar estado del repartidor:', err)
        });

        this.messages = [{ severity: 'success', summary: 'Éxito', detail: `Paquete ${packageId} actualizado a ${newStatus}` }];
        setTimeout(() => this.messages = [], 3000);
      },
      error: (err) => {
        console.error('Error al actualizar estado:', err);
        this.messages = [{ severity: 'error', summary: 'Error', detail: `No se pudo actualizar el estado del paquete ${packageId}.` }];
      }
    });
  }

  /**
   * Inicializa el mapa Leaflet.
   */
  private async initializeMap() {
    if (typeof window !== 'undefined') {
      try {
        const L = await import('leaflet');
        this.L = L;

        this.map = L.map('map').setView([20.65636, -100.40507], 16);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> contributors',
        }).addTo(this.map);

        const iconUrl = 'https://res.cloudinary.com/ddfc17kwj/image/upload/v1754577392/icono_1_bpeooy.png';
        const deliveryIcon = L.icon({
          iconUrl,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        this.deliveryMarker = L.marker([20.65636, -100.40507], { icon: deliveryIcon })
          .addTo(this.map)
          .bindPopup('Repartidor')
          .openPopup();

        this.refreshPackageMarkers();
        this.services.getLatestLocationByUser(this.userId).subscribe({
          next: (loc) => {
            if (loc && this.isValidLatLng(loc.last_lat, loc.last_lng)) {
              this.updateMapLocation(loc);
            }
          },
          error: (err) => console.error('Error al obtener última ubicación:', err)
        });
      } catch (error) {
        console.error('Error al cargar Leaflet:', error);
      }
    }
  }

  /**
   * Actualiza el marcador del mapa con la nueva ubicación.
   * @param location Objeto con las coordenadas y el estado.
   */
  updateMapLocation(location: any) {
    if (!this.map || !this.deliveryMarker) return;

    const lat = parseFloat(location.last_lat ?? location.lat ?? location.latitude);
    const lng = parseFloat(location.last_lng ?? location.lng ?? location.longitude);

    if (!this.isValidLatLng(lat, lng)) {
      console.warn('Ubicación inválida en updateMapLocation:', location);
      return;
    }

    this.deliveryMarker.setLatLng([lat, lng]);
    this.map.setView([lat, lng], this.map.getZoom());
    this.deliveryMarker.setPopupContent(`Repartidor<br>Estado: ${location.status ?? 'Desconocido'}`);
  }

  /**
   * Actualiza los marcadores de los paquetes en el mapa.
   */
  private refreshPackageMarkers() {
    if (!this.map || !this.L) return;

    this.packageMarkers.forEach(marker => this.map.removeLayer(marker));
    this.packageMarkers = [];

    const packageIcon = this.L.icon({
      iconUrl: 'https://res.cloudinary.com/ddfc17kwj/image/upload/v1754577392/icono_1_bpeooy.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    this.packages.forEach(pkg => {
      if (this.isValidLatLng(pkg.delivery_lat, pkg.delivery_lng)) {
        const marker = this.L.marker([pkg.delivery_lat, pkg.delivery_lng], { icon: packageIcon })
          .addTo(this.map)
          .bindPopup(`Paquete: ${pkg.id}<br>Destino: ${pkg.delivery_address}`);
        this.packageMarkers.push(marker);
      }
    });
  }

  /**
   * Valida si las coordenadas son válidas.
   */
  private isValidLatLng(lat: any, lng: any): boolean {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    return !isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
  }
}