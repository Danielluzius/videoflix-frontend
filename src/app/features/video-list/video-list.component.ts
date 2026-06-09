import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
  ElementRef,
  ViewChild,
} from '@angular/core';
import Hls from 'hls.js';
import Plyr from 'plyr';
import { VideoService, Video } from '../../core/services/video.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [],
  templateUrl: './video-list.component.html',
  styleUrl: './video-list.component.scss',
})
export class VideoListComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayVideo') overlayVideoRef!: ElementRef<HTMLVideoElement>;

  private videoService = inject(VideoService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  videos: Video[] = [];
  newestVideos: Video[] = [];
  categories: string[] = [];

  videoTitle = 'Oops... there are no videos !';
  videoDescription = '';
  loadError = false;

  currentVideo: number | null = null;
  overlayOpen = false;
  overlayTitle = '';
  currentThumbnailUrl = '';
  thumbnailVisible = true;
  previewVideoReady = false;
  titleFading = false;
  previewVisible = true;

  private hls: Hls | null = null;
  private overlayHls: Hls | null = null;
  private plyr: Plyr | null = null;
  private previewEndedListener: (() => void) | null = null;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly PREVIEW_DURATION_MS = 16_000;
  private autoAdvanceStopped = false;

  private resizeObservers: ResizeObserver[] = [];
  private resizeListeners: Array<() => void> = [];

  ngOnInit(): void {
    this.authService.startTokenRefreshInterval();
    this.loadVideos();
  }

  ngOnDestroy(): void {
    this.authService.stopTokenRefreshInterval();
    this.hls?.destroy();
    this.overlayHls?.destroy();
    this.plyr?.destroy();
    if (this.previewTimer) clearTimeout(this.previewTimer);
    const videoEl = this.videoPlayerRef?.nativeElement;
    if (videoEl && this.previewEndedListener) {
      videoEl.removeEventListener('ended', this.previewEndedListener);
    }
    this.resizeObservers.forEach((o) => o.disconnect());
    this.resizeListeners.forEach((fn) =>
      window.removeEventListener('resize', fn),
    );
  }

  private loadVideos(): void {
    this.videoService.getVideos().subscribe({
      next: (response) => {
        if (!response.ok) {
          this.loadError = true;
          this.toast.showToastMessage(true, ['Failed to load videos']);
          return;
        }
        this.videos = response.data as Video[];
        this.newestVideos = this.videoService.getNewestVideos(this.videos);

        const catSet = new Set(
          this.videos.map((v) => v.category.toLowerCase()),
        );
        this.categories = [...catSet].filter((c) => c !== 'newest');

        if (this.videos.length > 0) {
          this.videoTitle = this.videos[0].title;
          this.videoDescription = this.videos[0].description;
          this.currentVideo = this.videos[0].id;
          this.currentThumbnailUrl = this.videos[0].thumbnail_url;
          setTimeout(() => {
            this.loadVideo(this.videos[0].id, '480p');
            this.initScrollIndicators();
          }, 0);
        }
      },
      error: () => {
        this.loadError = true;
        this.toast.showToastMessage(true, ['Failed to load videos']);
      },
    });
  }

  getVideosForCategory(cat: string): Video[] {
    return this.videos.filter((v) => v.category.toLowerCase() === cat);
  }

  showVideo(id: number): void {
    this.autoAdvanceStopped = true;
    this.currentVideo = id;
    // Fade out preview, pause video after fade completes
    this.previewVisible = false;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    setTimeout(() => {
      this.videoPlayerRef?.nativeElement?.pause();
    }, 500);
    this.openVideoOverlay(id, false);
  }

  // Used for the Newest carousel: show the video in the preview section
  // without opening the player overlay. The user can then press Play.
  previewVideo(id: number): void {
    this.autoAdvanceStopped = true;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    const video = this.videos.find((v) => v.id === id);
    if (!video) return;
    this.currentVideo = id;
    this.currentThumbnailUrl = video.thumbnail_url;
    this.thumbnailVisible = true;
    this.videoTitle = video.title;
    this.videoDescription = video.description;
    this.previewVisible = true;
    this.loadVideo(id, '480p');
  }

  playVideo(id?: number): void {
    const targetId = id ?? this.currentVideo;
    if (targetId == null) return;
    this.openVideoOverlay(targetId);
  }

  scrollHorizontally(event: MouseEvent, direction: 1 | -1): void {
    const btn = event.currentTarget as HTMLElement;
    const wrapper = btn.closest('.scroll-wrapper');
    const container = wrapper?.querySelector('ul') as HTMLElement | null;
    if (!container) return;
    container.scrollBy({
      left: direction * container.clientWidth * 0.85,
      behavior: 'smooth',
    });
  }

  // ── Preview Player ───────────────────────────────────────────────

  private loadVideo(id: number, resolution: string): void {
    const videoEl = this.videoPlayerRef?.nativeElement;
    if (!videoEl) return;

    if (this.previewEndedListener) {
      videoEl.removeEventListener('ended', this.previewEndedListener);
      this.previewEndedListener = null;
    }
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    this.hls?.destroy();
    this.hls = null;

    // Hide video — thumbnail shows until canplay fires
    this.previewVideoReady = false;

    // Show video as soon as browser has enough data (even before actually playing)
    videoEl.addEventListener(
      'canplay',
      () => {
        this.previewVideoReady = true;
      },
      { once: true },
    );

    // Start the auto-advance timer once actually playing
    const startTimer = () => {
      videoEl.removeEventListener('playing', startTimer);
      if (this.autoAdvanceStopped) return;
      if (this.previewTimer) clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(
        () => this.onPreviewEnded(),
        this.PREVIEW_DURATION_MS,
      );
    };
    videoEl.addEventListener('playing', startTimer);

    this.previewEndedListener = () => this.onPreviewEnded();
    videoEl.addEventListener('ended', this.previewEndedListener);

    const previewUrl = this.videos.find((v) => v.id === id)?.preview_clip_url;

    if (previewUrl) {
      // MP4 preview clip — fast, no HLS overhead
      videoEl.muted = true;
      videoEl.src = previewUrl;
      videoEl.loop = true;
      videoEl.addEventListener(
        'loadedmetadata',
        () => {
          videoEl.playbackRate = 0.5;
        },
        { once: true },
      );
      videoEl.load();
      videoEl.play().catch(() => {});
    } else {
      // Fallback: HLS (video has no preview clip yet)
      this.hls = this.createHlsInstance();
      this.hls.loadSource(this.videoService.getHlsUrl(id));
      this.hls.attachMedia(videoEl);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.loop = true;
        videoEl.addEventListener(
          'loadedmetadata',
          () => {
            videoEl.playbackRate = 0.5;
          },
          { once: true },
        );
        videoEl.play().catch(() => {});
      });
      this.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) console.error('HLS fatal error:', data);
      });
    }
  }

  private onPreviewEnded(): void {
    if (this.titleFading || this.autoAdvanceStopped) return;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    const idx = this.newestVideos.findIndex((v) => v.id === this.currentVideo);
    if (idx === -1) return;

    const nextIdx = (idx + 1) % this.newestVideos.length;
    const rotated = [
      ...this.newestVideos.slice(nextIdx),
      ...this.newestVideos.slice(0, nextIdx),
    ];
    const nextVideo = rotated[0];

    const newestUl = document.getElementById('newest') as HTMLElement | null;

    this.titleFading = true;
    this.previewVideoReady = false;
    this.thumbnailVisible = false;

    // Slide carousel left via CSS transform — works regardless of overflow
    if (newestUl) {
      const items = newestUl.querySelectorAll('li');
      const itemStep =
        items.length >= 2
          ? (items[1] as HTMLElement).offsetLeft -
            (items[0] as HTMLElement).offsetLeft
          : 229;

      // Ghost item: a temporary <li> that shows the item which will appear at
      // the right edge AFTER the teleport (= the last entry in rotated, which
      // is the previously-current item A). It slides in from the right during
      // the animation so there is no empty space and no "pop in".
      //
      // Only add the ghost when it would start OUTSIDE the scroll-wrapper's
      // visible area (i.e. existing items overflow the wrapper). If all items
      // fit on screen the ghost would be immediately visible, which looks worse.
      const lastItem = items[items.length - 1] as HTMLElement;
      const ghostNaturalStart = lastItem.offsetLeft + lastItem.offsetWidth + 16;
      let ghost: HTMLLIElement | null = null;

      if (ghostNaturalStart > newestUl.clientWidth) {
        ghost = document.createElement('li');
        const ghostImg = document.createElement('img');
        // Use the LAST item of the rotated array: that is the item that ends up
        // at the right edge after the teleport. Ghost and real item share the
        // same thumbnail → no visible thumbnail change after the swap.
        const incomingItem = rotated[rotated.length - 1];
        ghostImg.src = incomingItem.thumbnail_url;
        ghostImg.alt = incomingItem.title;
        ghostImg.style.pointerEvents = 'none';
        ghost.appendChild(ghostImg);
        newestUl.appendChild(ghost);
      }

      newestUl.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      newestUl.style.transform = `translateX(-${itemStep}px)`;

      const onTransitionEnd = () => {
        newestUl.removeEventListener('transitionend', onTransitionEnd);
        // Remove ghost before teleport so it doesn't interfere with Angular's
        // DOM diffing of the @for loop.
        if (ghost) newestUl.removeChild(ghost);
        // Teleport: rotate array and reset transform synchronously so the
        // browser never paints the intermediate state.
        this.newestVideos = rotated;
        this.cdr.detectChanges();
        newestUl.style.transition = 'none';
        newestUl.style.transform = 'translateX(0)';
        // Force a reflow so 'transition: none' is committed before the next
        // animation potentially starts.
        void newestUl.offsetWidth;
      };
      newestUl.addEventListener('transitionend', onTransitionEnd);
    }

    // Swap title and thumbnail after fade-out, then load new video
    setTimeout(() => {
      this.videoTitle = nextVideo.title;
      this.videoDescription = nextVideo.description;
      this.currentVideo = nextVideo.id;
      this.currentThumbnailUrl = nextVideo.thumbnail_url;
      this.thumbnailVisible = true;
      this.loadVideo(nextVideo.id, '480p');
      if (newestUl) this.updateScrollIndicator(newestUl);

      setTimeout(() => {
        this.titleFading = false;
      }, 50);
    }, 500);
  }

  // ── Overlay ──────────────────────────────────────────────────────

  openVideoOverlay(videoId: number, autoPlay = true): void {
    const video = this.videos.find((v) => v.id === videoId);
    if (!video) return;

    this.overlayOpen = true;
    this.overlayTitle = video.title;
    document.body.classList.add('overlay-open');
    document.body.style.overflow = 'hidden';
    this.hideHeader();

    setTimeout(() => {
      this.loadVideoInOverlay(videoId, autoPlay);
    }, 0);
  }

  closeVideoOverlay(): void {
    // Destroy players BEFORE setting overlayOpen = false so Angular does not
    // remove the video element from the DOM while HLS / Plyr still reference it.
    if (this.overlayHls) {
      this.overlayHls.destroy();
      this.overlayHls = null;
    }
    if (this.plyr) {
      this.plyr.destroy();
      this.plyr = null;
    }

    // Setting this to false triggers @if(overlayOpen) to destroy the <video>
    // element. A fresh element is created on the next open, avoiding any stale
    // Plyr / HLS state that would prevent re-initialisation.
    this.overlayOpen = false;
    document.body.classList.remove('overlay-open');
    document.body.style.overflow = 'auto';
    this.showHeader();

    // Resume preview and restart carousel auto-advance
    this.autoAdvanceStopped = false;
    this.thumbnailVisible = true;
    this.previewVisible = true;
    const previewEl = this.videoPlayerRef?.nativeElement;
    if (previewEl) {
      previewEl.play().catch(() => {});
      if (this.previewTimer) clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(
        () => this.onPreviewEnded(),
        this.PREVIEW_DURATION_MS,
      );
    }
  }

  private loadVideoInOverlay(id: number, autoPlay = true): void {
    // Use getElementById instead of @ViewChild to always get the live DOM node,
    // even if Plyr has moved the element inside its wrapper during a previous session.
    const overlayEl = document.getElementById(
      'overlayVideo',
    ) as HTMLVideoElement | null;
    if (!overlayEl) return;

    if (this.plyr) {
      this.plyr.destroy();
      this.plyr = null;
    }
    if (this.overlayHls) {
      this.overlayHls.destroy();
      this.overlayHls = null;
    }

    // Fully reset the media element before HLS attaches via MediaSource Extensions.
    // Setting src='' would cause a failed network load; removeAttribute+load() resets
    // to NETWORK_EMPTY / HAVE_NOTHING which is what HLS.js requires.
    overlayEl.removeAttribute('src');
    overlayEl.load();

    this.overlayHls = this.createHlsInstance();
    const url = this.videoService.getHlsUrl(id);
    this.overlayHls.loadSource(url);
    this.overlayHls.attachMedia(overlayEl);

    this.overlayHls.on(Hls.Events.MANIFEST_PARSED, () => {
      const hls = this.overlayHls!;
      // Heights descending (1080, 720, 480) + 0 for Auto
      const heights = hls.levels.map((l) => l.height).reverse();
      heights.push(0);

      this.plyr = new Plyr(overlayEl, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'mute',
          'volume',
          'settings',
          'pip',
          'fullscreen',
        ],
        settings: ['quality'],
        quality: {
          default: 0,
          options: heights,
          forced: true,
          onChange: (newQuality: number) => {
            if (newQuality === 0) {
              hls.currentLevel = -1;
            } else {
              const idx = hls.levels.findIndex((l) => l.height === newQuality);
              if (idx !== -1) hls.currentLevel = idx;
            }
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        i18n: { qualityLabel: { 0: 'Auto' } } as any,
      });

      if (autoPlay) {
        setTimeout(() => {
          this.plyr?.play();
        }, 2000);
      }
    });

    this.overlayHls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) console.error('HLS overlay fatal error:', data);
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.overlayOpen) {
      this.closeVideoOverlay();
    }
  }

  // ── Header hide/show ─────────────────────────────────────────────

  private hideHeader(): void {
    const header = document.querySelector('.main_header') as HTMLElement;
    if (header) {
      header.style.transform = 'translateY(-100%)';
      header.style.opacity = '0';
      header.style.transition =
        'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    }
  }

  private showHeader(): void {
    const header = document.querySelector('.main_header') as HTMLElement;
    if (header) {
      header.style.transform = 'translateY(0)';
      header.style.opacity = '1';
      header.style.transition =
        'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    }
  }

  // ── Scroll indicators ────────────────────────────────────────────

  private initScrollIndicators(): void {
    const lists = document.querySelectorAll('.video_list ul');
    lists.forEach((list) => {
      const ul = list as HTMLElement;
      this.updateScrollIndicator(ul);

      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => this.updateScrollIndicator(ul));
        ro.observe(ul);
        if (ul.parentElement) ro.observe(ul.parentElement);
        this.resizeObservers.push(ro);
      }

      const resizeFn = (): void => {
        setTimeout(() => this.updateScrollIndicator(ul), 100);
      };
      window.addEventListener('resize', resizeFn);
      this.resizeListeners.push(resizeFn);

      ul.addEventListener('scroll', () => this.updateScrollIndicator(ul));
    });
  }

  private updateScrollIndicator(container: HTMLElement): void {
    const scrollWrapper = container.closest('.scroll-wrapper');
    if (!scrollWrapper) return;
    const hasRight =
      Math.ceil(container.scrollLeft) + container.clientWidth <
      container.scrollWidth - 1;
    const hasLeft = container.scrollLeft > 1;
    scrollWrapper.classList.toggle('has-overflow-right', hasRight);
    scrollWrapper.classList.toggle('has-overflow-left', hasLeft);
  }

  // ── HLS factory ──────────────────────────────────────────────────

  private createHlsInstance(): Hls {
    return new Hls({
      xhrSetup: (xhr: XMLHttpRequest) => {
        xhr.withCredentials = true;
      },
      ...environment.hls,
    });
  }
}
