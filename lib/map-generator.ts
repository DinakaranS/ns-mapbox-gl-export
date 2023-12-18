import {jsPDF} from 'jspdf';
import 'jspdf-autotable';
import {saveAs} from 'file-saver';
import {accessToken, Map as MapboxMap} from 'mapbox-gl';
import 'js-loading-overlay';
import {fabric} from 'fabric';

type PDFOptions = {
    title?: string,
    subTitle?: string,
    logo?: string,
    scale?: string
}

export const Format = {
    JPEG: 'jpg',
    PNG: 'png',
    PDF: 'pdf',
    SVG: 'svg',
} as const;
type Format = typeof Format[keyof typeof Format];

export const Unit = {
    // don't use inch unit. because page size setting is using mm unit.
    in: 'in',
    mm: 'mm',
} as const;
type Unit = typeof Unit[keyof typeof Unit];

export const Size = {
    // A0, A1, B0, B1 are not working well.
    // A0: [1189, 841],
    // A1: [841, 594],
    LETTER: [279, 216], // 8.5x11 - works
    //TABLOID: [432,279] // 11x17 - not working currently prints to 11.68x8.27 in landscape
    A2: [594, 420],
    A3: [420, 297],
    A4: [297, 210],
    A5: [210, 148],
    A6: [148, 105],
    // B0: [1414, 1000],
    // B1: [1000, 707],
    B2: [707, 500],
    B3: [500, 353],
    B4: [353, 250],
    B5: [250, 176],
    B6: [176, 125],

} as const;
type Size = typeof Size[keyof typeof Size];

export const PageOrientation = {
    Landscape: 'landscape',
    Portrait: 'portrait',
} as const;
type PageOrientation = typeof PageOrientation[keyof typeof PageOrientation];

export const DPI = {
    72: 72,
    96: 96,
    200: 200,
    300: 300,
    400: 400,
} as const;
type DPI = typeof DPI[keyof typeof DPI];
export default class MapGenerator {
    private map: MapboxMap;

    private width: number;

    private height: number;

    private dpi: number;

    private format: string;

    private unit: Unit;

    private accesstoken: string | undefined;

    private logoURL: string | undefined;

    /**
     * Constructor
     * @param map MapboxMap object
     * @param size layout size. default is A4
     * @param dpi dpi value. deafult is 300
     * @param format image format. default is PNG
     * @param unit length unit. default is mm
     */
    constructor(
        map: MapboxMap,
        size: Size = Size.A4,
        dpi: number = 300,
        format: string = Format.PNG.toString(),
        unit: Unit = Unit.mm,
        accesstoken?: string,
        logoURL?: string,
    ) {
        this.map = map;
        this.width = size[0];
        this.height = size[1];
        this.dpi = dpi;
        this.format = format;
        this.unit = unit;
        this.accesstoken = accesstoken;
        this.logoURL = logoURL;
    }

    /**
     * Generate and download Map image
     */
    generate(loader?: boolean, fName?: string, pdfOptions?: PDFOptions, callback?: (error: any, data: any) => void) {
        const this_ = this;

        if (loader) {
            // see documentation for JS Loading Overray library
            // https://js-loading-overlay.muhdfaiz.com
            // @ts-ignore
            JsLoadingOverlay.show({
                overlayBackgroundColor: '#5D5959',
                overlayOpacity: '0.6',
                spinnerIcon: 'ball-spin',
                spinnerColor: '#2400FD',
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
        if (style && style.sources) {
            const sources = style.sources;
            Object.keys(sources).forEach((name) => {
                const src = sources[name];
                Object.keys(src).forEach((key) => {
                    // delete properties if value is undefined.
                    // for instance, raster-dem might has undefined value in "url" and "bounds"
                    if (!src[key]) delete src[key];
                });
            });
        }
        const mapScale = this.getMapScaleInFeets(this.map.getZoom())

        // Render map
        const renderMap = new MapboxMap({
            accessToken: this.accesstoken || accessToken,
            container,
            style,
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
        const images = (this.map.style.imageManager || {}).images || [];
        Object.keys(images).forEach((key) => {
            if (images[key].data && images[key].data.width) renderMap.addImage(key, images[key].data);
        });

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
                    this_.toPDF(renderMap, fileName, {scale: `1'' = ${mapScale.toString()}`, ...pdfOptions}, callback);
                    break;
                case Format.SVG:
                    this_.toSVG(canvas, fileName);
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
    private toPNG(canvas: HTMLCanvasElement, fileName: string, callback?: ((error: any, data: any) => void) | undefined) {
        canvas.toBlob((blob) => {
            if (callback) callback(null, blob)
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
    private toJPEG(canvas: HTMLCanvasElement, fileName: string, callback?: ((error: any, data: any) => void) | undefined) {
        const uri = canvas.toDataURL('image/jpeg', 0.85);
        if (callback) callback(null, uri)
        else {
            const a = document.createElement('a');
            a.href = uri;
            a.download = fileName;
            a.click();
            a.remove();
        }
    }

    /**
     * Convert Map object to PDF
     * @param map mapboxgl.Map object
     * @param fileName file name
     * @param pdfOptions
     * @param callback callback
     */
    private toPDF(map: mapboxgl.Map, fileName?: string, pdfOptions?: PDFOptions, callback?: ((error: any, data: any) => void) | undefined) {
        const canvas = map.getCanvas();
        const pdf = new jsPDF({
            orientation: this.width > this.height ? 'l' : 'p',
            unit: this.unit,
            compress: true,
            format: [this.width, this.height],
        });
        pdf.setFontSize(13);
        const width = pdf.internal.pageSize.getWidth()
        pdf.text((pdfOptions?.title || '').toString(), width / 2, 15, {align: 'center', maxWidth: this.width - 20})
        pdf.addImage(canvas.toDataURL('image/png'), 'png', 10, 17, this.width - 20, this.height - 55, undefined, 'FAST');

        // Define the table columns and rows
        const columns = [pdfOptions?.scale, pdfOptions?.subTitle, this.formatDate(new Date()), ''];

        // Set the table options
        const options = {
            theme: 'grid',
            tableLineColor: [0, 0, 0],
            tableLineWidth: 0.50,
            startY: this.height - 35, // Vertical position to start the table (in mm)
            styles: {
                overflow: 'linebreak',
                fontSize: 12,
                fontStyle: 'bold',
                halign: 'center', // left, center, right
                valign: 'middle' // top, middle, bott,
            },
            headStyles: {
                fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5,
                minCellHeight: 25,
                cellWidth: ((this.width - 20) / 4),
            },
            bodyStyles: {minCellHeight: 100, lineColor: [0, 0, 0]},
            margin: {top: 0, left: 10, right: 10, bottom: 0},
            didDrawCell: (data: {
                section: string;
                column: { index: number; };
                cell: { x: number; width: string | number; y: number; };
            }) => {
                if (data.section === 'head' && data.column.index === 3 && (this.logoURL || pdfOptions?.logo)) {
                    const img = new Image();
                    img.src = (this.logoURL || pdfOptions?.logo) + '?' + Math.random();
                    pdf.addImage(img, 'JPEG', data.cell.x + this.percentCalculation(data.cell.width, 32), data.cell.y + 2, 20, 20)
                }
            },
        };

        // Generate the table
        // @ts-ignore
        pdf.autoTable(columns, [], options);

        const {lng, lat} = map.getCenter();
        pdf.setProperties({
            title: map.getStyle().name,
            subject: `center: [${lng}, ${lat}], zoom: ${map.getZoom()}`,
            creator: 'Nobel Systems Map Exporter',
            author: '(c)Nobel Systems',
        });
        if (callback) callback(null, pdf.output('blob'))
        else pdf.save(fileName);
    }

    /**
     * Convert canvas to SVG
     * this SVG export is using fabric.js. It is under experiment.
     * Please also see their document.
     * http://fabricjs.com/docs/
     * @param canvas Canvas element
     * @param fileName file name
     */
    private toSVG(canvas: HTMLCanvasElement, fileName: string) {
        const uri = canvas.toDataURL('image/png');
        fabric.Image.fromURL(uri, (image) => {
            const tmpCanvas = new fabric.Canvas('canvas');
            const pxWidth = Number(this.toPixels(this.width, this.dpi).replace('px', ''));
            const pxHeight = Number(this.toPixels(this.height, this.dpi).replace('px', ''));
            image.scaleToWidth(pxWidth);
            image.scaleToHeight(pxHeight);

            tmpCanvas.add(image);
            const svg = tmpCanvas.toSVG({
                // @ts-ignore
                x: 0,
                y: 0,
                width: pxWidth,
                height: pxHeight,
                viewBox: {
                    x: 0,
                    y: 0,
                    width: pxWidth,
                    height: pxHeight,
                },
            });
            const a = document.createElement('a');
            a.href = `data:application/xml,${encodeURIComponent(svg)}`;
            a.download = fileName;
            a.click();
            a.remove();
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
    private padTo2Digits = (num: number) => {
        return num.toString().padStart(2, '0');
    }

    /**
     *
     * @param date
     */
    private formatDate = (date: Date) => {
        return [
            this.padTo2Digits(date.getDate()),
            this.padTo2Digits(date.getMonth() + 1),
            date.getFullYear(),
        ].join('/');
    }

    private percentCalculation = (total: number | string, percent: number | string): number => {
        const c = (parseFloat(total.toString()) * parseFloat(percent.toString())) / 100;
        return parseFloat(c.toString());
    };

    private getMapScaleInFeets = (zoom: number) => {
        return Math.round((591657550.500000 / Math.pow(2, zoom + 1)) / 12).toFixed(0);
    };
}
