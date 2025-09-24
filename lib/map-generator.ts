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
  logoSize?: any;
  logoBase64?: string;
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
    try {
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
              if (
                image
                  && typeof image.width === 'number'
                  && typeof image.height === 'number'
                  && image.data instanceof Uint8Array
              ) {
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
    } catch (e) {
      if (loader) {
        // @ts-ignore
        JsLoadingOverlay.hide();
      }
      console.error(e);
    }
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
    callback?: (error: any, data: Blob | null) => void,
  ) {
    canvas.toBlob(
      (blob) => {
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
      },
      'image/jpeg',
      0.85,
    );
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
    try {
      const canvas = map.getCanvas();

      // Define the maximum width and height for the image in the PDF
      const maxWidth = this.width - 20; // Subtract margins
      const maxHeight = this.height - 55; // Subtract space for title and other elements

      // Stretch the image to fill the entire width of the PDF page
      const imageWidth = maxWidth; // Use the full width of the PDF page
      let imageHeight = (canvas.height / canvas.width) * imageWidth;

      // Calculate the y position to center the image vertically

      let yPosition = 13 + (maxHeight - imageHeight) / 2;

      // If hideTitle is true and hideFooter is false, add 7 to yPosition
      if (!pdfOptions?.hideTitle && pdfOptions?.hideFooter) {
        yPosition += 15;
      }
      if (this.height > this.width) {
        imageHeight += 12;
        yPosition -= 5;
      }
      // Create the PDF
      const pdf = new jsPDF({
        orientation: this.width > this.height ? 'l' : 'p',
        unit: this.unit,
        compress: true,
        format: [this.width, this.height],
      });

      // Add the title
      // pdf.setFontSize(13);
      // const width = pdf.internal.pageSize.getWidth();
      // pdf.text((pdfOptions?.title || '').toString(), width / 2, 9, {
      //   align: 'center',
      //   maxWidth: this.width - 20,
      // });

      const largePaperSize = (
        // Check for landscape or portrait [863, 558]
        (this.width === 863 && this.height === 558)
          || (this.width === 558 && this.height === 863)
          // Check for landscape or portrait [914, 609]
          || (this.width === 914 && this.height === 609)
          || (this.width === 609 && this.height === 914)
      );

      const imageData = largePaperSize ? canvas.toDataURL('image/jpeg', 0.9) : canvas.toDataURL('image/png');
      // Add the map image to the PDF
      pdf.addImage(
        imageData,
        largePaperSize ? 'JPEG' : 'PNG',
        10, // x position (left-aligned)
        yPosition + (!pdfOptions?.hideTitle ? 0 : 15),
        imageWidth, // width (stretched to fill the page width)
        imageHeight,
        undefined,
        'FAST',
      );

      if (!pdfOptions?.hideTitle) {
        // Add the title AFTER the map image to show it on top
        pdf.setFontSize(13);
        const width = pdf.internal.pageSize.getWidth();
        const titleText = (pdfOptions?.title || '').toString() || ' '; // Ensure there's a space if no title is provided
        // const textWidth = pdf.getTextWidth(titleText);
        const titleHeight = 9; // Height for the title background
        const padding = 2; // Padding for the background

        // Set fill color to white for the background
        pdf.setFillColor(255, 255, 255); // White background

        // Draw a white rectangle to fill the entire width of the PDF
        pdf.rect(
          0, // x position (start at the left edge)
          0, // y position (start at the top edge)
          width, // fill the entire width of the PDF
          titleHeight + padding * 2, // height with padding
          'F', // 'F' means fill the rectangle
        );

        // Set text color to black
        pdf.setTextColor(0, 0, 0);

        // Add title text centered horizontally
        pdf.text(titleText, width / 2, titleHeight / 2 + padding, {
          align: 'center',
          maxWidth: this.width - 20,
        });
      }

      if (!pdfOptions?.hideFooter) {
        // Define the table columns and rows
        const columns = [
          pdfOptions?.scale,
          pdfOptions?.subTitle,
          this.formatDate(new Date()),
          '',
        ];

        const infoRow = [
          'This map may represent a visual display of related geographic information. Data provided here is not a guarantee of actual field conditions. To ensure complete accuracy, please contact the responsible staff for the most up-to-date information.',
        ];

        // Set the table options
        const options = {
          theme: 'grid',
          tableLineColor: [0, 0, 0],
          tableLineWidth: 0.5,
          startY: this.height - 40,
          styles: {
            overflow: 'linebreak',
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
            minCellHeight: 25,
            cellWidth: (this.width - 20) / 4,
          },
          bodyStyles: { minCellHeight: 100, lineColor: [0, 0, 0] },
          margin: {
            top: 0,
            left: 10,
            right: 10,
            bottom: 0,
          },
          didDrawCell: (data: {
            section: string;
            column: { index: number };
            cell: {
              x: number;
              width: string | number;
              y: number;
              height: number;
            };
          }) => {
            if (
              data.section === 'head'
                && data.column.index === 3
                && pdfOptions?.logoBase64
            ) {
              const cellWidth = Number(data.cell.width);
              const cellHeight = data.cell.height;

              const logoWidth = pdfOptions?.logoSize?.width || 20;
              const logoHeight = pdfOptions?.logoSize?.height || 20;

              const x = data.cell.x + (cellWidth - logoWidth) / 2;
              const y = data.cell.y + (cellHeight - logoHeight) / 2;

              pdf.addImage(pdfOptions?.logoBase64, 'PNG', x, y, logoWidth, logoHeight);
            } else if (
              data.section === 'head'
                && data.column.index === 3
                && (this.logoURL || pdfOptions?.logo)
            ) {
              const img = new Image();
              img.src = `${this.logoURL || pdfOptions?.logo}?${Math.random()}`;
              const cellWidth = typeof data.cell.width === 'number'
                ? data.cell.width
                : parseFloat(data.cell.width);
              const cellHeight = data.cell.height;
              const logoWidth = pdfOptions?.logoSize?.width || 20;
              const logoHeight = pdfOptions?.logoSize?.height || 20;
              const xPosition = data.cell.x + (cellWidth - logoWidth) / 2;
              const yPosition = data.cell.y + (cellHeight - logoHeight) / 2;
              pdf.addImage(
                img,
                'JPEG',
                xPosition,
                yPosition,
                logoWidth,
                logoHeight,
              );
            }
          },
        };

        // Generate the table
        // @ts-ignore
        pdf.autoTable(columns, [], options);

        const informationRowOptions = {
          ...options,
          // @ts-ignore
          startY: pdf.autoTable.previous.finalY,
          bodyStyles: {
            minCellHeight: 10,
            lineColor: [0, 0, 0],
            fontSize: 8.5,
            halign: 'left',
          },
          cellWidth: this.width - 20,
        };

        // @ts-ignore
        pdf.autoTable([columns], [infoRow], informationRowOptions);
      }

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
    } catch (e) {
      console.error(e);
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
  private toSVG(
    canvas: HTMLCanvasElement,
    fileName: string,
    callback?: ((error: any, data: any) => void) | undefined,
  ) {
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
