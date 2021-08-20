import * as turf from "@turf/turf";
import { getCoord, point } from "@turf/turf";
import randomPointsOnPolygon from "random-points-on-polygon";
import uuid from "react-uuid";
import {
  EvacuationCenter,
  FirstAidCamp,
  FoodCenter,
  FoodDistributionCenter,
  InspectionCenter,
  MedicalCamp,
  ReallocationCenter,
} from "../../models/Building";
import House from "../../models/House";
import People from "../../models/People";
import * as constants from "./constants";

// Generate an earthquake
export const initializeEarthquake = () => {
  const epicenter = turf.point(constants.epicenterCoordinates);
  const [earthquakeMagnitude, earthquakeMagnitudeIndex] =
    constants.generateEarthquake();
  const faultRegionRadius =
    constants.faultRegionRadius[earthquakeMagnitudeIndex];
  const faultRegion = turf.circle(
    epicenter.geometry.coordinates,
    faultRegionRadius,
    {
      units: "kilometers",
      properties: {
        radius: faultRegionRadius,
        magnitude: earthquakeMagnitude,
        epicenter,
      },
    }
  );

  // Create the bounding box
  const minBoundPoint = turf.rhumbDestination(
    epicenter,
    2.15 * faultRegionRadius,
    -45,
    { units: "kilometers" }
  );
  const maxBoundPoint = turf.rhumbDestination(
    epicenter,
    2.15 * faultRegionRadius,
    135,
    { units: "kilometers" }
  );
  const surroundingRegionBoundingBox = [
    ...minBoundPoint.geometry.coordinates,
    ...maxBoundPoint.geometry.coordinates,
  ];
  const surroundingRegion = turf.difference(
    turf.bboxPolygon(surroundingRegionBoundingBox),
    faultRegion
  );

  // Evacuation Center
  const evacuationCenterCoordinates = randomPointsOnPolygon(
    constants.evacuationCenters[earthquakeMagnitudeIndex],
    faultRegion,
    {},
    true
  );
  const evacuationCenters = turf
    .coordAll(evacuationCenterCoordinates)
    .map((coordinates) => new EvacuationCenter(coordinates));

  // Population Creation
  const populationInFaultRegion = randomPointsOnPolygon(
    constants.populationInFaultRegion[earthquakeMagnitudeIndex],
    faultRegion,
    {},
    true
  );
  populationInFaultRegion.features.forEach((person) => {
    person.properties = new People(
      person.geometry.coordinates,
      Math.floor(
        Math.random() *
          constants.populationMinimumInitialHealth[earthquakeMagnitudeIndex] +
          11
      )
    );

    const nearest = turf.nearestPoint(person, evacuationCenterCoordinates);
    person.properties.destination =
      evacuationCenters[nearest.properties.featureIndex];
  });
  const populationSurrounding = randomPointsOnPolygon(
    constants.populationSurrounding,
    surroundingRegion,
    {},
    true
  );
  populationSurrounding.features.forEach((person) => {
    person.properties = new People(person.geometry.coordinates);
  });

  // Houses creation
  const housesInFaultRegionFeatures = randomPointsOnPolygon(
    constants.housesInFaultRegion[earthquakeMagnitudeIndex],
    faultRegion,
    {},
    true
  );
  const housesInFaultRegion = housesInFaultRegionFeatures.features.map(
    (feature, index) => {
      const occupants = populationInFaultRegion.features
        .slice(4 * index, 4 * (index + 1))
        .map((person) => person.properties);
      const house = new House(
        feature.geometry.coordinates,
        [],
        Math.floor(
          Math.random() *
            constants.houseMinimumInitialDamage[earthquakeMagnitudeIndex] +
            11
        )
      );
      occupants.forEach((occupant) => (occupant.house = house));

      return house;
    }
  );
  const housesSurroundingFeatures = randomPointsOnPolygon(
    constants.housesSurrounding,
    surroundingRegion,
    {},
    true
  );
  const housesSurrounding = housesSurroundingFeatures.features.map(
    (feature, index) => {
      const occupants = populationSurrounding.features
        .slice(4 * index, 4 * (index + 1))
        .map((person) => person.properties);
      const house = new House(feature.geometry.coordinates);
      occupants.forEach((occupant) => (occupant.house = house));
      return house;
    }
  );

  const firstAidCampPosition = turf.rhumbDestination(
    epicenter,
    1.15 * faultRegionRadius,
    Math.random() * 1000,
    { units: "kilometers" }
  );
  const medicalCampPosition = turf.rhumbDestination(
    turf.point(getCoord(firstAidCampPosition)),
    0.11 * faultRegionRadius,
    Math.random() * 1000,
    { units: "kilometers" }
  );
  const foodDistributionCenterPosition = turf.rhumbDestination(
    turf.point(getCoord(medicalCampPosition)),
    0.11 * faultRegionRadius,
    Math.random() * 1000,
    { units: "kilometers" }
  );
  const reallocationShelterPosition = turf.rhumbDestination(
    turf.point(getCoord(foodDistributionCenterPosition)),
    0.11 * faultRegionRadius,
    Math.random() * 1000,
    { units: "kilometers" }
  );
  const firstAidCamp = new FirstAidCamp(getCoord(firstAidCampPosition));
  const medicalCamp = new MedicalCamp(getCoord(medicalCampPosition));
  const foodDistributionCenter = new FoodDistributionCenter(
    getCoord(foodDistributionCenterPosition)
  );
  const reallocationCenter = new ReallocationCenter(
    getCoord(reallocationShelterPosition)
  );

  const foodCenterPositions = randomPointsOnPolygon(
    constants.foodCollectionCenters[earthquakeMagnitudeIndex],
    surroundingRegion,
    {},
    true
  );
  const foodCenters = foodCenterPositions.features.map((feature, index) => {
    const foodCenter = new FoodCenter(feature.geometry.coordinates);
    return foodCenter;
  });

  return {
    id: uuid(),
    faultRegion,
    mapBounds: surroundingRegionBoundingBox,
    populationProperties: {
      populationInFaultRegion,
      populationSurrounding,
      populationHealthDropBeforeFirstAid:
        constants.populationHealthDropBeforeFirstAid,
      populationHealthDropBeforeMedicalCamp:
        constants.populationHealthDropBeforeMedicalCamp,
    },
    houseProperties: {
      housesInFaultRegion,
      housesSurrounding,
    },
    phaseProperties: {
      evacuation: {
        evacuationCenters,
        evacuationCenterBufferTime: constants.evacuationCenterBufferTime,
      },
      firstAid: { firstAidCamp },
      medicalCamp: { medicalCamp },
      foodDistribution: { foodCenters, foodDistributionCenter },
      inspection: {
        inspectionCenter: new InspectionCenter(getCoord(epicenter)),
      },
      reallocation: { reallocationCenter },
    },
  };
};
