import along from "@turf/along";
import { lineString, point } from "@turf/helpers";
import { getCoord } from "@turf/invariant";
import uuid from "react-uuid";
import {
  populationEnergyDropBeforeFoodCamp,
  populationHealthDropBeforeFirstAid,
  populationHealthDropBeforeMedicalCamp,
} from "../app/data/constants";

export const Gender = {
  MALE: 0,
  FEMALE: 1,
};

export const EarthquakePhase = {
  EVACUATION: 0,
  FIRSTAID: 1,
  MEDICALCAMP: 2,
  FOODDISTRIBUTION: 3,
  REALLOCATION: 4,
  COMPLETED: 5,
};

class People {
  constructor(coordinates, health = 100) {
    this.id = uuid();
    this.age = Math.floor(Math.random() * 60) + 10;
    this.health = health;
    this.gender = Math.floor(Math.random() * Object.keys(Gender).length);
    this.coordinates = coordinates;
    this.house = null;
    this.speed = 0.25; // km per min
    this.energy = Math.random() * 2 + 8;
    this.financialStatus = Math.floor(Math.random() * 4);

    this.currentPhase = EarthquakePhase.EVACUATION;
    this.destination = null;
    this.hasReachedDestination = false;
  }

  updateHealth(deltaTime) {
    if (this.currentPhase > EarthquakePhase.FOODDISTRIBUTION) return;
    this.energy -= populationEnergyDropBeforeFoodCamp * deltaTime;
    if (this.energy < 0) this.energy = 0;

    if (this.currentPhase <= EarthquakePhase.MEDICALCAMP) {
      if (this.health > 0) {
        // Double health drop if energy is 0
        if (this.currentPhase <= EarthquakePhase.FIRSTAID) {
          this.health -=
            populationHealthDropBeforeFirstAid *
            deltaTime *
            (1 + this.energy === 0);
          return;
        }
        this.health -=
          populationHealthDropBeforeMedicalCamp *
          deltaTime *
          (1 + this.energy === 0);
      } else this.health = 0;
    }
  }

  moveToDestination(deltaTime) {
    // console.log(this.destination);
    if (!this.destination) return [false, point(this.coordinates)];

    const destinationCoordinates = this.destination.coordinates;

    if (destinationCoordinates === this.coordinates) {
      return [true, point(this.coordinates)];
    }

    const lineStringToDestination = lineString([
      this.coordinates,
      destinationCoordinates,
    ]);
    const newCoordinates = along(
      lineStringToDestination,
      this.speed * deltaTime,
      { units: "kilometers" }
    );

    this.coordinates = getCoord(newCoordinates);
    return [false, newCoordinates];
  }

  checkIfDead() {
    return this.health <= 0;
  }
}

export default People;
