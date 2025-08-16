import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeAComponent } from './home-a.component';

describe('HomeAComponent', () => {
  let component: HomeAComponent;
  let fixture: ComponentFixture<HomeAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeAComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
