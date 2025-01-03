import { IControl, Map as MapboxMap } from 'mapbox-gl';
import CrosshairManager from './crosshair-manager';
import PrintableAreaManager from './printable-area-manager';
import {
  english, finnish, french, german, swedish, Translation, vietnam,
} from './local';
import MapGenerator, {
  Size, Format, PageOrientation, DPI, Unit,
} from './map-generator';

type ControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type Options = {
    PageSize: any;
    PageOrientation: string;
    Format: string;
    DPI: number;
    Crosshair?: boolean;
    PrintableArea: boolean;
    accessToken?: string;
    Local?: 'de' | 'en' | 'fr' | 'fi' | 'sv' | 'vi';
    logoURL?: string;
}

const enableDisableElement = (ids: string[], display: string) => {
  ids.map((id) => {
    const element: HTMLSelectElement = <HTMLSelectElement>document.getElementById(id);
    element.style.display = display;
  });
};

/**
 * Mapbox GL Export Control.
 * @param {Object} targets - Object of layer.id and title
 */
export default class MapboxExportControl implements IControl {
  private controlContainer: HTMLElement;

  private exportContainer: HTMLElement;

  private crosshair: CrosshairManager | undefined;

  private printableArea: PrintableAreaManager | undefined;

  private map?: MapboxMap;

  private exportButton: HTMLButtonElement;

  private options: Options = {
    PageSize: Size.A4,
    PageOrientation: PageOrientation.Landscape,
    Format: Format.PDF,
    DPI: DPI[300],
    Crosshair: false,
    PrintableArea: false,
    accessToken: undefined,
    logoURL: undefined,
  };

  constructor(options: Options) {
    if (options) {
      this.options = Object.assign(this.options, options);
    }
    this.onDocumentClick = this.onDocumentClick.bind(this);
  }

  public getDefaultPosition = (): ControlPosition => 'top-right';

  public getTranslation(): Translation {
    switch (this.options.Local) {
      case 'de':
        return german;
      case 'en':
        return english;
      case 'fr':
        return french;
      case 'fi':
        return finnish;
      case 'sv':
        return swedish;
      case 'vi':
        return vietnam;
      default:
        return english;
    }
  }

  private calculateScale(): string {
    if (!this.map) {
      return 'Scale not available';
    }
    const zoom = this.map.getZoom();
    const maxZoom = this.map.getMaxZoom();
    const reverseZoom = maxZoom - zoom;
    const scaleValue = (2 ** reverseZoom) * 4;
    return `1" = ${scaleValue.toFixed(0)} ft`;
  }

  private updateScaleOnZoom(): void {
    if (!this.map) return;
    this.map.on('zoom', () => {
      const scaleInput = document.getElementById('mapbox-gl-export-scale') as HTMLInputElement;
      if (scaleInput) {
        scaleInput.value = this.calculateScale().replace('1" = ', '').replace(' ft', '').trim();
      }
    });
  }

  public onAdd(map: MapboxMap): HTMLElement {
    this.map = map;
    this.controlContainer = document.createElement('div');
    this.controlContainer.classList.add('mapboxgl-ctrl');
    this.controlContainer.classList.add('mapboxgl-ctrl-group');
    this.exportContainer = document.createElement('div');
    this.exportContainer.classList.add('mapboxgl-export-list');
    this.exportButton = document.createElement('button');
    this.exportButton.classList.add('mapboxgl-ctrl-icon');
    this.exportButton.classList.add('mapboxgl-export-control');
    this.exportButton.type = 'button';
    this.exportButton.addEventListener('click', () => {
      this.exportButton.style.display = 'none';
      this.exportContainer.style.display = 'block';
      this.toggleCrosshair(true);
      this.togglePrintableArea(true);
    });
    document.addEventListener('click', this.onDocumentClick);
    this.controlContainer.appendChild(this.exportButton);
    this.controlContainer.appendChild(this.exportContainer);

    const table = document.createElement('TABLE');
    table.className = 'print-table';

    const tr1 = this.createSelection(Size, this.getTranslation().PageSize, 'page-size', this.options.PageSize, (data, key) => JSON.stringify(data[key]));
    table.appendChild(tr1);

    const tr2 = this.createSelection(PageOrientation, this.getTranslation().PageOrientation, 'page-orientaiton', this.options.PageOrientation, (data, key) => data[key]);
    table.appendChild(tr2);

    const tr3 = this.createSelection(Format, this.getTranslation().Format, 'format-type', this.options.Format, (data, key) => data[key]);
    table.appendChild(tr3);

    const tr4 = this.createSelection(DPI, this.getTranslation().DPI, 'dpi-type', this.options.DPI, (data, key) => data[key]);
    table.appendChild(tr4);

    const scaleRow = this.createScaleRow();
    table.appendChild(scaleRow);

    const tr5 = this.createTextInput('Title', 'pdf-title');
    table.appendChild(tr5);

    const tr6 = this.createTextInput('SubTitle', 'pdf-sub-title');
    table.appendChild(tr6);

    this.exportContainer.appendChild(table);

    const generateButton = document.createElement('button');
    generateButton.type = 'button';
    generateButton.textContent = this.getTranslation().Generate;
    generateButton.classList.add('generate-button');
    generateButton.addEventListener('click', () => {
      const pageSize: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-page-size');
      const pageOrientation: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-page-orientaiton');
      const formatType: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-format-type');
      const dpiType: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-dpi-type');
      const titleEl: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-pdf-title');
      const subTitleEl: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-pdf-sub-title');

      const orientValue = pageOrientation.value;
      let pageSizeValue = JSON.parse(pageSize.value);
      let title: string = '';
      let subTitle: string = '';
      if (orientValue === PageOrientation.Portrait) {
        pageSizeValue = pageSizeValue.reverse();
      }
      if (titleEl && titleEl.value) {
        title = titleEl.value;
      }
      if (subTitleEl && subTitleEl.value) {
        subTitle = subTitleEl.value;
      }
      const mapGenerator = new MapGenerator(
        map,
        pageSizeValue,
        Number(dpiType.value),
        formatType.value,
        Unit.mm,
        this.options.accessToken,
        this.options.logoURL,
      );
      mapGenerator.generate(true, `map-export-${(new Date().toJSON().slice(0, 10))}`, { title, subTitle });
    });
    this.exportContainer.appendChild(generateButton);

    this.updateScaleOnZoom();

    return this.controlContainer;
  }

  private createSelection(
    data: Object,
    title: string,
    type: string,
    defaultValue: any,
    converter: Function,
  ): HTMLElement {
    const label = document.createElement('label');
    label.textContent = title;

    const content = document.createElement('select');
    content.setAttribute('id', `mapbox-gl-export-${type}`);
    content.style.width = '100%';
    Object.keys(data).forEach((key) => {
      const optionLayout = document.createElement('option');
      optionLayout.setAttribute('value', converter(data, key));
      optionLayout.appendChild(document.createTextNode(key));
      optionLayout.setAttribute('name', type);
      if (defaultValue === data[key]) {
        optionLayout.selected = true;
      }
      content.appendChild(optionLayout);
    });
    content.addEventListener('change', () => {
      this.updatePrintableArea();
    });

    const tr1 = document.createElement('TR');
    const tdLabel = document.createElement('TD');
    const tdContent = document.createElement('TD');
    tdLabel.appendChild(label);
    tdContent.appendChild(content);
    tr1.appendChild(tdLabel);
    tr1.appendChild(tdContent);
    return tr1;
  }

  private createScaleRow(): HTMLElement {
    const label = document.createElement('label');
    label.textContent = 'Scale';
    const static1 = document.createElement('span');
    static1.textContent = '1"=';
    const scaleInput = document.createElement('input');
    scaleInput.setAttribute('id', 'mapbox-gl-export-scale');
    scaleInput.type = 'text';
    scaleInput.style.width = '80px';
    scaleInput.style.marginLeft = '5px';
    scaleInput.readOnly = false;
    scaleInput.value = this.calculateScale().replace('1" = ', '').replace(' ft', '').trim();
    scaleInput.addEventListener('blur', () => {
      const value = scaleInput.value.trim();
      if (value === '') {
        this.showErrorMessage('Enter valid input');
      } else {
        this.handleScaleInputChange(value);
      }
    });
    scaleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const value = scaleInput.value.trim();
        if (value !== '') {
          this.handleScaleInputChange(value);
        }
      }
    });
    scaleInput.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | null;
      if (target) {
        const sanitizedValue = target.value.replace(/[^0-9\s]/g, '');
        target.value = sanitizedValue;
      }
    });
    const staticFt = document.createElement('span');
    staticFt.textContent = ' ft';
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    const tdContent = document.createElement('td');
    tdLabel.appendChild(label);
    const scaleContainer = document.createElement('div');
    scaleContainer.style.display = 'flex';
    scaleContainer.style.alignItems = 'center';
    scaleContainer.appendChild(static1);
    scaleContainer.appendChild(scaleInput);
    scaleContainer.appendChild(staticFt);
    tdContent.appendChild(scaleContainer);
    tr.appendChild(tdLabel);
    tr.appendChild(tdContent);
    return tr;
  }

  private handleScaleInputChange(value: string): void {
    const scaleValue = parseFloat(value.replace('1" = ', '').replace(' ft', '').trim());
    if (Number.isNaN(scaleValue)) {
      this.showErrorMessage('Enter valid input');
      return;
    }
    if (!this.map) {
      console.error('Map is not available');
      return;
    }
    const maxZoom = this.map.getMaxZoom();
    const reverseZoom = Math.log(scaleValue / 4) / Math.log(2);
    const zoomLevel = maxZoom - reverseZoom;
    this.map.setZoom(zoomLevel);
  }

  private showErrorMessage(message: string): void {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.color = 'black';
    modal.style.padding = '15px 60px';
    modal.style.borderRadius = '5px';
    modal.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.5)';
    modal.style.zIndex = '1000';
    modal.style.display = 'none';

    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageText.style.color = 'black';
    messageText.style.fontSize = '25px';

    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.marginTop = '10px';
    okButton.style.backgroundColor = '#0000CD';
    okButton.style.color = 'white';
    okButton.style.border = 'none';
    okButton.style.padding = '10px 20px';
    okButton.style.cursor = 'pointer';
    okButton.style.marginLeft = 'auto';
    okButton.style.marginRight = 'auto';
    okButton.style.display = 'block';

    okButton.addEventListener('click', (event: MouseEvent) => {
      modal.style.display = 'none';
      event.stopPropagation();
    });

    modal.appendChild(messageText);
    modal.appendChild(okButton);
    document.body.appendChild(modal);
    modal.style.display = 'block';

    if (this.map) {
      this.map.on('click', () => {
        modal.style.display = 'none';
      });
    }
  }

  private createTextInput(
    title: string,
    type: string,
  ): HTMLElement {
    const isTitle: boolean = type === 'pdf-title';
    const label = document.createElement('label');
    label.setAttribute('id', `mapbox-gl-export-label-${type}`);
    label.textContent = title;
    label.style.display = 'none';

    const content = document.createElement(isTitle ? 'textarea' : 'input');
    content.setAttribute('id', `mapbox-gl-export-${type}`);
    content.style.width = '100%';
    content.style.marginRight = '5px';
    content.style.display = 'none';

    if (isTitle) content.setAttribute('rows', '4');

    content.addEventListener('change', () => {
      this.updatePrintableArea();
    });

    const tr1 = document.createElement('TR');
    const tdLabel = document.createElement('TD');
    const tdContent = document.createElement('TD');
    tdLabel.appendChild(label);
    tdContent.appendChild(content);
    tr1.appendChild(tdLabel);
    tr1.appendChild(tdContent);
    return tr1;
  }

  public onRemove(): void {
    if (!this.controlContainer
            || !this.controlContainer.parentNode
            || !this.map
            || !this.exportButton) {
      return;
    }
    this.exportButton.removeEventListener('click', this.onDocumentClick);
    this.controlContainer.parentNode.removeChild(this.controlContainer);
    document.removeEventListener('click', this.onDocumentClick);

    if (this.crosshair !== undefined) {
      this.crosshair.destroy();
      this.crosshair = undefined;
    }

    this.map = undefined;
  }

  private onDocumentClick(event: MouseEvent): void {
    if (
      this.controlContainer
            && !this.controlContainer.contains(event.target as Element)
            && this.exportContainer
            && this.exportButton) {
      this.exportContainer.style.display = 'none';
      this.exportButton.style.display = 'block';
      this.toggleCrosshair(false);
      this.togglePrintableArea(false);
    }
  }

  private toggleCrosshair(state: boolean) {
    if (this.options.Crosshair === true) {
      if (state === false) {
        if (this.crosshair !== undefined) {
          this.crosshair.destroy();
          this.crosshair = undefined;
        }
      } else {
        this.crosshair = new CrosshairManager(this.map);
        this.crosshair.create();
      }
    }
  }

  private togglePrintableArea(state: boolean) {
    if (this.options.PrintableArea === true) {
      if (state === false) {
        if (this.printableArea !== undefined) {
          this.printableArea.destroy();
          this.printableArea = undefined;
        }
      } else {
        this.printableArea = new PrintableAreaManager(this.map);
        this.updatePrintableArea();
      }
    }
  }

  private updatePrintableArea() {
    if (this.printableArea === undefined) {
      return;
    }
    const pageSize: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-page-size');
    const pageOrientation: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-page-orientaiton');
    const format: HTMLSelectElement = <HTMLSelectElement>document.getElementById('mapbox-gl-export-format-type');
    if (format && format.value && format.value === 'pdf') {
      enableDisableElement(['mapbox-gl-export-label-pdf-title', 'mapbox-gl-export-pdf-title', 'mapbox-gl-export-label-pdf-sub-title', 'mapbox-gl-export-pdf-sub-title'], 'block');
    } else enableDisableElement(['mapbox-gl-export-label-pdf-title', 'mapbox-gl-export-pdf-title', 'mapbox-gl-export-label-pdf-sub-title', 'mapbox-gl-export-pdf-sub-title'], 'none');
    const orientValue = pageOrientation.value;
    let pageSizeValue = JSON.parse(pageSize.value);
    if (orientValue === PageOrientation.Portrait) {
      pageSizeValue = pageSizeValue.reverse();
    }
    this.printableArea.updateArea(pageSizeValue[0], pageSizeValue[1]);
  }
}
