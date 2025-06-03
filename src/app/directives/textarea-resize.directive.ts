import { Directive, HostListener, ElementRef, Renderer2, Input } from '@angular/core';

@Directive({
  selector: 'textarea[appTextareaResize]',
  standalone: true
})
export class TextareaResizeDirective {

  @Input() maxRows = 6;
  private initialHeight: number;
  private lineHeight: number;

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnInit() {
    this.setInitialStyles();
    this.adjustHeight();
  }

  private setInitialStyles() {
    // Sauvegarder la hauteur initiale
    this.initialHeight = this.el.nativeElement.scrollHeight;

    // Calculer la hauteur de ligne (peut nécessiter ajustement selon votre CSS)
    const computedStyle = window.getComputedStyle(this.el.nativeElement);
    this.lineHeight = parseInt(computedStyle.lineHeight, 10) || 20; // Valeur par défaut si non définie

    // Définir les styles de base
    this.renderer.setStyle(this.el.nativeElement, 'overflow-y', 'auto');
    this.renderer.setStyle(this.el.nativeElement, 'resize', 'none');
  }

  @HostListener('input')
  onInput() {
    this.adjustHeight();
  }

  private adjustHeight() {
    // Réinitialiser la hauteur pour obtenir la hauteur de défilement correcte
    this.renderer.setStyle(this.el.nativeElement, 'height', 'auto');

    const scrollHeight = this.el.nativeElement.scrollHeight;
    const maxHeight = this.lineHeight * this.maxRows;

    // Limiter la hauteur au maximum défini
    const newHeight = Math.min(scrollHeight, maxHeight);

    this.renderer.setStyle(
      this.el.nativeElement,
      'height',
      `${newHeight}px`
    );
  }

}
