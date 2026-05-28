import { Component, HostBinding, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  @HostBinding('class') hostClass = 'img_bg index_bg';

  private router = inject(Router);

  ngOnInit(): void {
    this.hostClass = this.getBodyClass(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.hostClass = this.getBodyClass(
          (e as NavigationEnd).urlAfterRedirects,
        );
      });
  }

  private getBodyClass(url: string): string {
    if (url === '/') return 'img_bg index_bg';
    if (
      url.startsWith('/auth/login') ||
      url.startsWith('/auth/forgot-password') ||
      url.startsWith('/auth/confirm-password')
    )
      return 'img_bg login_bg';
    if (url.startsWith('/auth/register') || url.startsWith('/auth/activate'))
      return 'img_bg signup_bg';
    return 'dark_bg';
  }
}
