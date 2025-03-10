import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';
import mapboxgl, { Map as MapboxMap } from 'mapbox-gl';
import 'js-loading-overlay';
import { fabric } from 'fabric';

type PDFOptions = {
  title?: string;
  subTitle?: string;
  logo?: string;
  scale?: string;
  hideFooter?: boolean;
  hideTitle?: boolean;
};

export const Format = {
  JPEG: 'jpg',
  PNG: 'png',
  PDF: 'pdf',
  SVG: 'svg',
} as const;
type Format = (typeof Format)[keyof typeof Format];

export const Unit = {
  // don't use inch unit. because page size setting is using mm unit.
  in: 'in',
  mm: 'mm',
} as const;
type Unit = (typeof Unit)[keyof typeof Unit];

export const Size = {
  '4.1 x 5.8 (A6)': [148, 105],
  '4.9 x 6.9 (B6)': [176, 125],
  '5.8 x 8.3 (A5)': [210, 148],
  '6.9 x 9.8 (B5)': [250, 176],
  '8.3 x 11.7 (A4)': [297, 210],
  '8.5 x 11 (LETTER)': [279, 216], // 8.5x11 - works
  '9.8 x 13.9 (B4)': [353, 250],
  '11.7 x 16.5 (A3)': [420, 297],
  '11 x 17 (TABLOID)': [420, 297],
  '13.9 x 19.7 (B3)': [500, 353],
  '16.5 x 23.4 (A2)': [594, 420],
  '19.7 x 27.8 (B2)': [707, 500],
  '22 x 34 (D)': [863, 558],
  '24 x 36 (E)': [914, 609],
} as const;

// {
//   // A0, A1, B0, B1 are not working well.
//   // A0: [1189, 841],
//   // A1: [841, 594],
//   '8.5 x 11 (LETTER)': [279, 216], // 8.5x11 - works
//   // TABLOID: [432,279] // 11x17 - not working currently prints to 11.68x8.27 in landscape
//   '16.5 x 23.4 (A2)': [594, 420],
//   '11.7 x 16.5 (A3)': [420, 297],
//   '8.3 x 11.7 (A4)': [297, 210],
//   '5.8 x 8.3 (A5)': [210, 148],
//   '4.1 x 5.8 (A6)': [148, 105],
//   // B0: [1414, 1000],
//   // B1: [1000, 707],
//   '19.7 x 27.8 (B2)': [707, 500],
//   '13.9 x 19.7 (B3)': [500, 353],
//   '9.8 x 13.9 (B4)': [353, 250],
//   '6.9 x 9.8 (B5)': [250, 176],
//   '4.9 x 6.9 (B6)': [176, 125],
//   '22 x 34 (D)': [863, 558],
//   '24 x 36 (E)': [914, 609],
// } as const;
type Size = (typeof Size)[keyof typeof Size];

export const PageOrientation = {
  Landscape: 'landscape',
  Portrait: 'portrait',
} as const;
type PageOrientation = (typeof PageOrientation)[keyof typeof PageOrientation];

export const DPI = {
  72: 72,
  96: 96,
  200: 200,
  300: 300,
  400: 400,
} as const;
type DPI = (typeof DPI)[keyof typeof DPI];
export default class MapGenerator {
  private map: MapboxMap;

  private width: number;

  private height: number;

  private dpi: number;

  private format: string;

  private unit: Unit;

  private accessToken: string | undefined;

  private logoURL: string | undefined;

  private adjustment: number | undefined;

  /**
   * Constructor
   * @param map MapboxMap object
   * @param size layout size. default is A4
   * @param dpi dpi value. deafult is 300
   * @param format image format. default is PNG
   * @param unit length unit. default is mm
   * @param accessToken
   * @param logoURL
   * @param adjustment
   */
  constructor(
    map: MapboxMap,
    size: Size = Size['8.3 x 11.7 (A4)'],
    dpi: number = 300,
    format: string = Format.PNG.toString(),
    unit: Unit = Unit.mm,
    accessToken?: string,
    logoURL?: string,
    adjustment?: number,
  ) {
    this.map = map;
    this.width = size[0];
    this.height = size[1];
    this.dpi = dpi;
    this.format = format;
    this.unit = unit;
    this.accessToken = accessToken;
    this.logoURL = logoURL;
    this.adjustment = adjustment;
  }

  // private stringify(obj) {
  //   let cache = [];
  //   const str = JSON.stringify(obj, (key, value) => {
  //     if (typeof value === "object" && value !== null) {
  //       // eslint-disable-next-line
  //       // @ts-ignore
  //       if (cache.indexOf(value) !== -1) {
  //         // Circular reference found, discard key
  //         return;
  //       }
  //       // Store value in our collection
  //       // eslint-disable-next-line
  //       // @ts-ignore
  //       cache.push(value);
  //     }
  //     return value;
  //   });
  //   // eslint-disable-next-line
  //   // @ts-ignore
  //   cache = null; // reset the cache
  //   return str;
  // }

  /**
   * Generate and download Map image
   */
  generate(
    loader?: boolean,
    fName?: string,
    pdfOptions?: PDFOptions,
    callback?: (error: any, data: any) => void,
  ) {
    const this_ = this;

    if (loader) {
      // see documentation for JS Loading Overray library
      // https://js-loading-overlay.muhdfaiz.com
      // @ts-ignore
      JsLoadingOverlay.show({
        overlayBackgroundColor: '#5D5959',
        overlayOpacity: '0.6',
        spinnerIcon: 'ball-spin',
        spinnerColor: '#5733d6',
        spinnerSize: '2x',
        overlayIDName: 'overlay',
        spinnerIDName: 'spinner',
        offsetX: 0,
        offsetY: 0,
        containerID: null,
        lockScroll: false,
        overlayZIndex: 9998,
        spinnerZIndex: 9999,
      });
    }
    // Calculate pixel ratio
    const actualPixelRatio: number = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      get() {
        return this_.dpi / 96;
      },
    });
    // Create map container
    const hidden = document.createElement('div');
    hidden.className = 'hidden-map';
    document.body.appendChild(hidden);
    const container = document.createElement('div');
    container.style.width = this.toPixels(this.width);
    container.style.height = this.toPixels(this.height);
    hidden.appendChild(container);

    const style = this.map.getStyle();
    if (style) {
      if (style.sources) {
        const sources = style.sources;
        Object.keys(sources).forEach((name) => {
          const src = sources[name];
          Object.keys(src).forEach((key) => {
            if (!src[key]) delete src[key];
          });
        });
      }
    }

    const mapScale = this.getMapScaleInFeets(this.map.getZoom());

    const validStyle = style || 'mapbox://styles/mapbox/streets-v11';

    const renderMap = new MapboxMap({
      accessToken: this.accessToken || mapboxgl.accessToken || '',
      container,
      style: validStyle,
      center: this.map.getCenter(),
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
      interactive: false,
      preserveDrawingBuffer: true,
      fadeDuration: 0,
      attributionControl: false,
      // hack to read transfrom request callback function
      transformRequest: (this.map as any)._requestManager._transformRequestFn,
    });

    // @ts-ignore
    // Ensure renderMap's style is fully loaded before adding images
    const addImagesToRenderMap = () => {
      // Get existing images from the image manager
      const images = renderMap.style?.imageManager?.images || {};

      if (images && Object.keys(images).length > 0) {
        Object.keys(images).forEach((key) => {
          if (!key || !images[key].data) return;
          if (!renderMap.hasImage(key)) {
            const image = images[key];
            if (image && typeof image.width === 'number' && typeof image.height === 'number' && image.data instanceof Uint8Array) {
              renderMap.addImage(key, {
                width: image.width,
                height: image.height,
                data: image.data,
              });
            } else {
              console.error(`Invalid image object structure for key: ${key}`);
            }
          }
        });
      }

      // Load and add a new image into renderMap
      renderMap.loadImage(
        'https://geoviewer.io/img/ns_marker.png',
        (error, image) => {
          if (error) {
            console.error('Error loading image:', error);
            return;
          }
          if (!renderMap.hasImage('gl-draw-ns-marker')) {
            if (image) {
              renderMap.addImage('gl-draw-ns-marker', image, { sdf: true });
              console.log('Image added successfully.');
            }
          } else {
            console.log('Image already exists.');
          }
        },
      );
    };

    // 🔹 Wait until renderMap is fully loaded before adding images
    if (!renderMap.isStyleLoaded()) {
      console.log('Waiting for renderMap to load...');
      renderMap.once('style.load', addImagesToRenderMap);
    } else {
      addImagesToRenderMap();
    }

    renderMap.once('idle', () => {
      const canvas = renderMap.getCanvas();
      const fileName = `${fName || 'map'}.${this_.format}`;
      switch (this_.format) {
        case Format.PNG:
          this_.toPNG(canvas, fileName, callback);
          break;
        case Format.JPEG:
          this_.toJPEG(canvas, fileName, callback);
          break;
        case Format.PDF:
          this_.toPDF(
            renderMap,
            fileName,
            { scale: `1'' = ${mapScale.toString()} ft`, ...pdfOptions },
            callback,
          );
          break;
        case Format.SVG:
          this_.toSVG(canvas, fileName, callback);
          break;
        default:
          console.error(`Invalid file format: ${this_.format}`);
          break;
      }

      renderMap.remove();
      hidden.parentNode?.removeChild(hidden);
      Object.defineProperty(window, 'devicePixelRatio', {
        get() {
          return actualPixelRatio;
        },
      });

      if (loader) {
        // @ts-ignore
        JsLoadingOverlay.hide();
      }
    });
  }

  /**
   * Convert canvas to PNG
   * @param canvas Canvas element
   * @param fileName file name
   * @param callback callback
   */
  private toPNG(
    canvas: HTMLCanvasElement,
    fileName: string,
    callback?: ((error: any, data: any) => void) | undefined,
  ) {
    canvas.toBlob((blob) => {
      if (callback) callback(null, blob);
      else {
        // @ts-ignore
        saveAs(blob, fileName);
      }
    });
  }

  /**
   * Convert canvas to JPEG
   * @param canvas Canvas element
   * @param fileName file name
   * @param callback callback
   */
  private toJPEG(
    canvas: HTMLCanvasElement,
    fileName: string,
    callback?: ((error: any, data: Blob | null) => void),
  ) {
    canvas.toBlob((blob) => {
      if (callback) {
        callback(null, blob);
      } else {
        const uri = canvas.toDataURL('image/jpeg', 0.85);
        const a = document.createElement('a');
        a.href = uri;
        a.download = fileName;
        a.click();
        a.remove();
      }
    }, 'image/jpeg', 0.85);
  }

  /**
   * Convert Map object to PDF
   * @param map mapboxgl.Map object
   * @param fileName file name
   * @param pdfOptions
   * @param callback callback
   */
  private toPDF(
    map: mapboxgl.Map,
    fileName?: string,
    pdfOptions?: PDFOptions,
    callback?: ((error: any, data: any) => void) | undefined,
  ) {
    const canvas = map.getCanvas();

    // Determine if the title/footer should be hidden.
    const hideTitle = pdfOptions && pdfOptions.hideTitle;
    const hideFooter = pdfOptions && pdfOptions.hideFooter;
    const titleHeight = hideTitle ? 5 : 10; // Reserve 10px for the title if not hidden.
    const footerHeight = hideFooter ? 5 : 27; // Reserve 27px for the footer if not hidden.
    const sideMargin = 5; // 5px margin for left and right edges.
    const titleText = pdfOptions?.title || '';
    const titleFontSize = 10; // Font size for the title.

    // Create the PDF instance.
    const pdf = new jsPDF({
      orientation: this.width > this.height ? 'l' : 'p',
      unit: this.unit,
      compress: true,
      format: [this.width, this.height],
    });

    // Add title if not hidden.
    if (!hideTitle) {
      pdf.setFontSize(titleFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text(titleText, this.width / 2, 7, { align: 'center' });
    }

    // Calculate the image dimensions.
    const imageX = sideMargin;
    const imageY = titleHeight;
    const imageWidth = this.width - 2 * sideMargin;
    const imageHeight = this.height - titleHeight - footerHeight;
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'png',
      imageX,
      imageY,
      imageWidth,
      imageHeight,
      undefined,
      'FAST',
    );

    // Draw footer if not hidden.
    if (!hideFooter) {
      const footerY = this.height - footerHeight;

      // --- Top 16px: Four equally divided grids with borders ---
      const gridHeight = 16;
      const usableWidth = this.width - 2 * sideMargin;
      const columnWidth = usableWidth / 4;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold'); // Bold text for grids

      // Draw borders for each grid cell and add content.
      for (let i = 0; i < 4; i++) {
        const cellX = sideMargin + i * columnWidth;
        pdf.rect(cellX, footerY, columnWidth, gridHeight);
      }

      // Grid 1: Scale (placeholder).
      const col1CenterX = sideMargin + columnWidth / 2;
      pdf.setFontSize(9);
      pdf.text(pdfOptions?.scale || '', col1CenterX, footerY + gridHeight / 2 + 3, { align: 'center' });

      // Grid 2: pdfOptions.subTitle (if provided).
      const col2CenterX = sideMargin + columnWidth + columnWidth / 2;
      const subTitle = (pdfOptions && pdfOptions.subTitle) ? pdfOptions.subTitle : '';
      pdf.setFontSize(9);
      pdf.text(subTitle, col2CenterX, footerY + gridHeight / 2 + 3, { align: 'center' });

      // Grid 3: Date.
      const col3CenterX = sideMargin + 2 * columnWidth + columnWidth / 2;
      const dateText = this.formatDate(new Date());
      pdf.setFontSize(9);
      pdf.text(dateText, col3CenterX, footerY + gridHeight / 2 + 3, { align: 'center' });

      // Grid 4: Logo image from URL.
      const col4X = sideMargin + 3 * columnWidth;
      const col4Y = footerY;
      // Calculate maximum dimensions.
      const maxWidth = columnWidth * 0.8;
      const maxHeight = gridHeight * 0.8;
      // For a round logo, choose a square dimension to preserve aspect ratio.
      const logoDimension = Math.min(maxWidth, maxHeight);
      const logoX = col4X + (columnWidth - logoDimension) / 2;
      const logoY = col4Y + (gridHeight - logoDimension) / 2;
      try {
        // Assumes that this.logoURL is a valid data URL (e.g., "data:image/png;base64,...").
        pdf.addImage(this.logoURL || '', 'PNG', logoX, logoY, logoDimension, logoDimension);
      } catch (error) {
        // Fallback: if adding the image fails, print the URL as bold text.
        pdf.setFontSize(6);
        pdf.text(this.logoURL || '', col4X + columnWidth / 2, footerY + gridHeight / 2 + 3, { align: 'center' });
      }

      // --- Bottom (remaining): Disclaimer with border ---
      const disclaimerHeight = this.width > this.height ? 6 : 8;
      const disclaimerY = footerY + gridHeight;
      pdf.rect(sideMargin, disclaimerY, usableWidth, disclaimerHeight);
      pdf.setFontSize(this.width > this.height ? 6 : 5);
      pdf.setFont('helvetica', 'normal'); // Normal font for disclaimer
      const disclaimerText = 'This map may represent a visual display of related geographic information. Data provided here is not a guarantee of actual field conditions. To ensure complete accuracy, please contact the responsible staff for the most up-to-date information.';
      pdf.text(disclaimerText, sideMargin + 1, disclaimerY + disclaimerHeight / 2 + 1, { maxWidth: usableWidth - 2, align: 'left' });
    }

    // Set PDF properties.
    const { lng, lat } = map.getCenter();
    pdf.setProperties({
      title: 'Map PDF',
      subject: `center: [${lng}, ${lat}], zoom: ${map.getZoom()}`,
      creator: 'Nobel Systems Map Exporter',
      author: '(c)Nobel Systems',
    });

    if (callback) {
      const pdfBlob = pdf.output('blob');
      callback(null, pdfBlob);
    } else {
      pdf.save(fileName);
    }
  }

  /**
   * Convert canvas to SVG
   * this SVG export is using fabric.js. It is under experiment.
   * Please also see their document.
   * http://fabricjs.com/docs/
   * @param canvas Canvas element
   * @param fileName file name
   */
  private toSVG(canvas: HTMLCanvasElement, fileName: string, callback?: ((error: any, data: any) => void) | undefined) {
    const uri = canvas.toDataURL('image/png');
    // @ts-ignore
    fabric.Image.fromURL(uri, (image) => {
      const tmpCanvas = new fabric.Canvas('canvas');
      const pxWidth = Number(
        this.toPixels(this.width, this.dpi).replace('px', ''),
      );
      const pxHeight = Number(
        this.toPixels(this.height, this.dpi).replace('px', ''),
      );
      image.scaleToWidth(pxWidth);
      image.scaleToHeight(pxHeight);

      // Set canvas size to match the image size
      tmpCanvas.setWidth(pxWidth);
      tmpCanvas.setHeight(pxHeight);

      tmpCanvas.add(image);
      const svg = tmpCanvas.toSVG({
        // @ts-ignore
        x: 0,
        y: 0,
        // @ts-ignore
        width: pxWidth,
        // @ts-ignore
        height: pxHeight,
        viewBox: {
          x: 0,
          y: 0,
          width: pxWidth,
          height: pxHeight,
        },
      });
      if (callback) {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        callback(null, blob);
      } else {
        const a = document.createElement('a');
        a.href = `data:application/xml,${encodeURIComponent(svg)}`;
        a.download = fileName;
        a.click();
        a.remove();
      }
    });
  }

  /**
   * Convert mm/inch to pixel
   * @param length mm/inch length
   * @param conversionFactor DPI value. default is 96.
   */
  private toPixels(length: number, conversionFactor = 96) {
    if (this.unit === Unit.mm) {
      conversionFactor /= 25.4;
    }
    return `${conversionFactor * length}px`;
  }

  /**
   *
   * @param num
   */
  private padTo2Digits = (num: number) => num.toString().padStart(2, '0');

  /**
   *
   * @param date
   */
  private formatDate = (date: Date) => [
    this.padTo2Digits(date.getMonth() + 1),
    this.padTo2Digits(date.getDate()),
    date.getFullYear(),
  ].join('/');

  // private percentCalculation = (
  //   total: number | string,
  //   percent: number | string,
  // ): number => {
  //   const c = (parseFloat(total.toString()) * parseFloat(percent.toString())) / 100;
  //   return parseFloat(c.toString());
  // };

  private getMapScaleInFeets(zoom: number): string {
    return Math.round(
      591657550.5 / 2 ** (zoom + 1 + Number(this.adjustment)) / 12,
    ).toFixed(0);
  }
}
