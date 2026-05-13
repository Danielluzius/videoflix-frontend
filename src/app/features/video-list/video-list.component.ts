import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'app-video-list',
  standalone: true,
  template: `<main class="w_full d_flex_ss_gl font_white_color"></main>`,
})
export class VideoListComponent {
  @HostBinding('class') hostClass = 'dark_bg';
}
