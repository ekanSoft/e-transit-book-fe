import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main id="main-content" class="public-home">
    <h1>eTransitBook</h1>
    <p>Book a seat using your transport company's booking link.</p>
    <a href="https://app.etransitbook.com">Operator sign in</a>
  </main>`,
  styles: `
    .public-home {
      padding: clamp(3rem, 12vw, 10rem);
      display: grid;
      gap: 1rem;
    }
  `,
})
export class Home {}
