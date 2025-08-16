import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class ApiService implements OnDestroy {
  private apiUrl = 'http://localhost:3000';
  private socket: Socket | null = null;
  private readonly REQUEST_TIMEOUT = 5000; // ms

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.socket = io(this.apiUrl, { transports: ['websocket', 'polling'] });
    }
  }

  getUserLogin(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { username, password }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error getUserLogin', err);
        return throwError(() => err);
      })
    );
  }

  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error getUsers', err);
        return throwError(() => err);
      })
    );
  } 
  
  updateDeliveryStatus(userId: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/update-status/${userId}`, { status: status }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error updateUserStatus', err);
        return throwError(() => err);
      })
    );
  }

  getUsersDelivery(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users-delivery`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error getUsersDelivery', err);
        return throwError(() => err);
      })
    );
  }

  getLocation(): Observable<any> {
    return this.http.get(`${this.apiUrl}/location`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error getLocation', err);
        return throwError(() => err);
      })
    );
  }

  getLatestLocations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/location-latest`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error getLatestLocations', err);
        return throwError(() => err);
      })
    );
  }

  getPaquetes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/paquetes`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error getPaquetes', err);
        return throwError(() => err);
      })
    );
  }

  getPackagesByUser(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/packages/${userId}`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error getPackagesByUser', err);
        return throwError(() => err);
      })
    );
  }

  updatePackageStatus(packageId: string, newStatus: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/packages/${packageId}`, { status: newStatus }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error updatePackageStatus', err);
        return throwError(() => err);
      })
    );
  }

  addPackage(packageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-package`, packageData).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error addPackage', err);
        return throwError(() => err);
      })
    );
  }

  updateDeliveryLocation(userId: number, lat: number, lng: number, status: string): Observable<any> {
    if (isNaN(lat) || isNaN(lng)) {
      return throwError(() => new Error('Coordenadas inválidas'));
    }

    return this.http.post(`${this.apiUrl}/update-location`, {
      user_id: userId,
      last_lat: lat,
      last_lng: lng,
      status: status || 'En transito'
    }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Detalles del error updateDeliveryLocation:', {
          error: err,
          url: `${this.apiUrl}/update-location`,
          payload: { userId, lat, lng, status }
        });
        return throwError(() => err);
      })
    );
  }

  listenToLocationsStream(): Observable<any> {
    if (!this.socket) {
      return throwError(() => new Error('Socket no inicializado en el navegador.'));
    }
    return new Observable(observer => {
      const handler = (data: any) => observer.next(data);
      this.socket?.on('ubicaciones-actualizadas', handler);
      return () => {
        this.socket?.off('ubicaciones-actualizadas', handler);
      };
    });
  }

  listenToPackagesStream(): Observable<any> {
    if (!this.socket) {
      return throwError(() => new Error('Socket no inicializado en el navegador.'));
    }
    return new Observable(observer => {
      const handler = (data: any) => observer.next(data);
      this.socket?.on('paquete-asignado', handler);
      return () => {
        this.socket?.off('paquete-asignado', handler);
      };
    });
  }

  getLatestLocationByUser(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/location-latest/${userId}`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('Error getLatestLocationByUser', err);
        return throwError(() => err);
      })
    );
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }


}