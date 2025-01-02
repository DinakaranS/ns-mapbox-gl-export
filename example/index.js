import mapboxgl from 'mapbox-gl';
import {MapboxExportControl, Size, PageOrientation, Format, DPI} from '../lib/index';
import '../css/styles.css';

(() => {
    // mapboxgl.accessToken='your mapbox access token'
    const map = new mapboxgl.Map({
        container: 'map',
        // style: 'mapbox://styles/mapbox/streets-v11',
        style: 'https://narwassco.github.io/mapbox-stylefiles/unvt/style.json',
        center: [35.87063, -1.08551],
        zoom: 12,
        hash: true,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new MapboxExportControl({
        PageSize: Size.A4,
        PageOrientation: PageOrientation.Landscape,
        Format: Format.PDF,
        DPI: DPI[300],
        Crosshair: true,
        PrintableArea: true,
        Local: 'en',
        additionalProps: { logoSize:[40,20] },
        logoURL: 'https://s3.amazonaws.com/dev.geoviewer.io/img/sejpa.jpeg',
        accessToken:"pk.eyJ1IjoiYXJldGhhc2FtdWVsIiwiYSI6ImNpa2VkeXU2NjAwNDR1a20yMmV5aGZ3dDAifQ.qictWBxPjb9-SjxZ7ImS2g",
    }), 'top-right');
})()
