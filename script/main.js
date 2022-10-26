import Map from 'ol/Map';
import View from 'ol/View';
import { addProjection } from 'ol/proj';
import Projection from 'ol/proj/Projection';
import GeoTIFF from 'ol/source/GeoTIFF';
import VectorSource from 'ol/source/Vector';
import TileLayer from 'ol/layer/WebGLTile';
import VectorLayer from 'ol/layer/Vector';
import { ScaleLine, defaults as defaultControls, Attribution } from 'ol/control';

import Overlay from 'ol/Overlay';
import Draw from 'ol/interaction/Draw';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {LineString, Polygon} from 'ol/geom';
import {getArea, getLength} from 'ol/sphere';
import { unByKey } from 'ol/Observable';


// By default OpenLayers does not know about the EPSG:3059 (Latvia) projection.
// So we create a projection instance for EPSG:3059 and pass it to
// ol/proj~addProjection to make it available to the library for lookup by its
// code.

// The extent is used to determine zoom level 0. Recommended values for a
// projection's validity extent can be found at https://epsg.io/.
const extent = [-6434154.2142309108749032,-3933797.6607446353882551, 5488868.5070438561961055,4497446.2815334592014551]
const projection = new Projection({
  code: 'EPSG:3059',
  extent: extent,
  units: 'm',
});
addProjection(projection);

/**
 * Currently drawn feature.
 * @type {import("../src/ol/Feature.js").default}
 */
let sketch;

/**
 * The help tooltip element.
 * @type {HTMLElement}
 */
let helpTooltipElement;

/**
 * Overlay to show the help messages.
 * @type {Overlay}
 */
let helpTooltip;

/**
 * The measure tooltip element.
 * @type {HTMLElement}
 */
let measureTooltipElement;

/**
 * Overlay to show the measurement.
 * @type {Overlay}
 */
let measureTooltip;

/**
 * Message to show when the user is drawing a polygon.
 * @type {string}
 */
const continuePolygonMsg = 'Click to continue drawing the polygon';

/**
 * Message to show when the user is drawing a line.
 * @type {string}
 */
const continueLineMsg = 'Click to continue drawing the line';

/**
 * Distance measurment button.
 * @type {HTMLElement}
 */
const lengthMeasureButton = document.getElementById('length-measure');

/**
 * Status of the length measure tool.
 * @type {boolean}
 */
let lengthMeasureActive = false;

/**
 * Area measurment button.
 * @type {HTMLElement}
 */
const areaMeasureButton = document.getElementById('area-measure');

/**
 * Status of the area measure tool.
 * @type {boolean}
 */
let areaMeasureActive = false;

/**
 * Seting options of the scaleline.
 * @type {ScaleLine}
 */
const scaleControl = new ScaleLine({
  units: 'metric',
  bar: true,
  steps: 4,
  text: true,
  minWidth: 140,
});

const attribution = new Attribution({
  collapsible: false,
});

/**
 * Source for drawings.
 * @type {VectorSource}
 */
const DrawSource = new VectorSource();

DrawSource.setAttributions(`Fait par @Alifarka et @Baskaajis | `)
/**
 * Layer for drawings.
 * @type {VectorLayer}
 */
const drawVector = new VectorLayer({
  source: DrawSource,
  style: {
    'fill-color': 'rgba(255, 255, 255, 0.2)',
    'stroke-color': '#ffcc33',
    'stroke-width': 2,
    'circle-radius': 7,
    'circle-fill-color': '#ffcc33',
  },
});

/**
 * Handle pointer move.
 * @param {import("../src/ol/MapBrowserEvent").default} evt The event.
 */
const pointerMoveHandler = function (evt) {
  if (evt.dragging) {
    return;
  }
  /** @type {string} */
  let helpMsg = 'Click to start drawing';

  if (sketch) {
    const geom = sketch.getGeometry();
    if (geom instanceof Polygon) {
      helpMsg = continuePolygonMsg;
    } else if (geom instanceof LineString) {
      helpMsg = continueLineMsg;
    }
  }

  helpTooltipElement.innerHTML = helpMsg;
  helpTooltip.setPosition(evt.coordinate);

  if (areaMeasureActive || lengthMeasureActive) {
    helpTooltipElement.classList.remove('hidden');
  }
};

/**
 * Map to display Pandokh.
 * @type {Map}
 */
const map = new Map({
  controls: defaultControls({attribution: false}).extend([scaleControl, attribution]),
  target: 'map',
  layers: [
    drawVector
  ],
  // view: source.getView(),
  view: new View({
    projection: projection,
    extent: extent,
    center: [0, 0],
    constrainOnlyCenter: true,
    zoom: 3,
    maxZoom: 20,
    minZoom: 1
  })
});

createMeasureTooltip();
createHelpTooltip();

map.on('pointermove', pointerMoveHandler);

map.getViewport().addEventListener('mouseout', function () {
  helpTooltipElement.classList.add('hidden');
});

/**
 * Fetch the layer using blob because of Firefox issue 
 * @see. https://github.com/openlayers/openlayers/issues/13703
 */
fetch('../images/layers/out.tif')
  .then((response) => response.blob())
  .then((blob) => {
    const source = new GeoTIFF({
      sources: [
        {
          blob: blob,
        },
      ],
    });

    source.setAttributions('Monde de Pandokh par @Lucien Maine | ');

    map.addLayer(new TileLayer({
      name: 'Pandokh',
      source: source,
      zIndex: -1,
    }))
  });

/**
 * Fetch the layer using blob because of Firefox issue 
 * @see. https://github.com/openlayers/openlayers/issues/13703
 */
fetch('../images/layers/03-Caupona_Elyot-Veillon.tif')
  .then((response) => response.blob())
  .then((blob) => {
    const sourceCaupona = new GeoTIFF({
      sources: [
        {
          blob: blob,
        },
      ],
    });

    sourceCaupona.setAttributions('Caupona par @Elyot Veillon | ');

    map.addLayer(new TileLayer({
      name: 'Caupona',
      source: sourceCaupona,
      minZoom: 3,
      zIndex: 3,
      opacity: 0.8,
    }))
  });

/**
 * Fetch the layer using blob because of Firefox issue 
 * @see. https://github.com/openlayers/openlayers/issues/13703
 */
fetch('../images/layers/04-Kar-Karpar_Noob-Noob.tif')
  .then((response) => response.blob())
  .then((blob) => {
    const sourceKarKarpar = new GeoTIFF({
      sources: [
        {
          blob: blob,
        },
      ],
    });

    sourceKarKarpar.setAttributions('Montagne de Kar-Karpar par @Noob-Noob | ');

    map.addLayer(new TileLayer({
      name: 'Kar-Karpar',
      source: sourceKarKarpar,
      minZoom: 4,
      zIndex: 4,
    }))
  });

/**
 * Fetch the layer using blob because of Firefox issue 
 * @see. https://github.com/openlayers/openlayers/issues/13703
 */
fetch('../images/layers/04-Kar-Karpar-2_Noob-Noob.tif')
  .then((response) => response.blob())
  .then((blob) => {
    const sourceKarKarpar2 = new GeoTIFF({
      sources: [
        {
          blob: blob,
        },
      ],
    });

    sourceKarKarpar2.setAttributions('Montagne de Kar-Karpar par @Noob-Noob | ');

    map.addLayer(new TileLayer({
      name: 'Kar-Karpar',
      source: sourceKarKarpar2,
      minZoom: 5,
      zIndex: 5,
    }))
  });

/**
 * Fetch the layer using blob because of Firefox issue 
 * @see. https://github.com/openlayers/openlayers/issues/13703
 */
fetch('../images/layers/Kuchtei_Map_Dedale.tif')
  .then((response) => response.blob())
  .then((blob) => {
    const sourceKuchtei = new GeoTIFF({
      sources: [
        {
          blob: blob,
        },
      ],
    });

    sourceKuchtei.setAttributions('Ville de Kuchtei par @Dedale | ');

    map.addLayer(new TileLayer({
      name: 'Kuchtei',
      source: sourceKuchtei,
      minZoom: 8,
      zIndex: 8,
    }))
  });

/**
 * Fetch the layer using blob because of Firefox issue 
 * @see. https://github.com/openlayers/openlayers/issues/13703
 */
fetch('../images/layers/06-Ir_Elyot-Veillon.tif')
  .then((response) => response.blob())
  .then((blob) => {
    const sourceIr = new GeoTIFF({
      sources: [
        {
          blob: blob,
        },
      ],
    });

    sourceIr.setAttributions('Ville de Ir par @Elyot Veillon | ');

    map.addLayer(new TileLayer({
      name: 'Ir',
      source: sourceIr,
      minZoom: 10,
      zIndex: 10
    }))
  });


let draw; // global so we can remove it later

/**
 * Format length output.
 * @param {LineString} line The line.
 * @return {string} The formatted length.
 */
const formatLength = function (line) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
  } else {
    output = Math.round(length * 100) / 100 + ' ' + 'm';
  }
  return output;
};

/**
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
const formatArea = function (polygon) {
  const area = getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
  } else {
    output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
  }
  return output;
};

function addInteraction(type) {
  draw = new Draw({
    source: DrawSource,
    type: type,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
      }),
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
      }),
    }),
  });
  map.addInteraction(draw);


  let listener;
  draw.on('drawstart', function (evt) {
    // set sketch
    sketch = evt.feature;

    /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
    let tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on('change', function (evt) {
      const geom = evt.target;
      let output;
      if (geom instanceof Polygon) {
        output = formatArea(geom);
        tooltipCoord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof LineString) {
        output = formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
      }
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });
  });

  draw.on('drawend', function () {
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    unByKey(listener);
  });
}

/**
 * Creates a new help tooltip
 */
function createHelpTooltip() {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }
  helpTooltipElement = document.createElement('div');
  helpTooltipElement.className = 'ol-tooltip hidden';
  helpTooltip = new Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left',
  });
  map.addOverlay(helpTooltip);
}

/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
  measureTooltip = new Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false,
    insertFirst: false,
  });
  map.addOverlay(measureTooltip);
}

/**
 * Let user change the geometry type.
 */
lengthMeasureButton.onclick = function () {
  lengthMeasureActive = !lengthMeasureActive;
  if (lengthMeasureActive) {
    map.removeInteraction(draw);
    lengthMeasureButton.className = 'active';
    areaMeasureButton.className = '';
    addInteraction('LineString');
  } else {
    lengthMeasureButton.className = '';
    map.removeInteraction(draw);
    helpTooltipElement.classList.add('hidden');
  }
}

areaMeasureButton.onclick = function () {
  areaMeasureActive = !areaMeasureActive;
  if (areaMeasureActive) {
    map.removeInteraction(draw);
    areaMeasureButton.className = 'active';
    lengthMeasureButton.className = '';
    addInteraction('Polygon');
  } else {
    areaMeasureButton.className = '';
    map.removeInteraction(draw);
    helpTooltipElement.classList.add('hidden');
  }
}

/**
 * TODO
 * Creates the layer switcher with visibility and opacity
 */
function createLayerSwitcher() {
  const layerPopup = document.getElementById('layer-switcher-popup')
  const layerSwitcherGroup = document.getElementById('layer-switcher-cartes');

  map.getAllLayers().forEach(layer => {
    let layerElementList = document.createElement('li');
    layerSwitcherGroup.append(layerElementList);
    let layerElementName = document.createElement('span');
    layerElementName.innerHTML = layer.getProperties().name;
    layerElementList.append(layerElementName);
    let layerFieldset = document.createElement('fieldset');
    layerElementList.append(layerFieldset);
  })
}