import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `<main class="w_full d_flex_cc_gl"></main>`,
})
export class HomeComponent {
  @HostBinding('class') hostClass = 'img_bg index_bg';
}
