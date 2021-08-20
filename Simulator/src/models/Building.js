import uuid from "react-uuid";
import { evacuationCenterBufferTime } from "../app/data/constants";

class Building {
  constructor(coordinates) {
    this.id = uuid();
    this.coordinates = coordinates;
    this.occupants = [];
  }
}

export class EvacuationCenter extends Building {
  constructor(coordinates) {
    super(coordinates);
    this.isTransporting = false;
    this.waitingTimeBeforeEvacuation = evacuationCenterBufferTime;
    setInterval(() => {
      if (this.waitingTimeBeforeEvacuation > 0)
        this.waitingTimeBeforeEvacuation -= 1;
    }, 1000);
  }

  addOccupant(occupantId) {
    this.waitingTimeBeforeEvacuation = evacuationCenterBufferTime;
    this.occupants.push(occupantId);
  }

  isReadyForEvacuation() {
    return (
      this.waitingTimeBeforeEvacuation === 0 &&
      this.occupants.length > 0 &&
      !this.isTransporting
    );
  }
}

export class FirstAidCamp extends Building {
  addOccupants(occupantIds) {
    this.occupants.push(...occupantIds);
  }

  removeOccupant(occupantId) {
    this.occupants = this.occupants.filter(
      (occupant) => occupant !== occupantId
    );
  }
}

export class MedicalCamp extends Building {
  addOccupant(occupantId) {
    this.occupants.push(occupantId);
  }

  removeOccupant(occupantId) {
    this.occupants = this.occupants.filter(
      (occupant) => occupant !== occupantId
    );
  }
}

export class FoodCenter extends Building {
  constructor(coordinates) {
    super(coordinates);
    this.waitingTimeBeforeCalling = Math.floor(Math.random() * 61);
    this.collected = false;
    setInterval(() => {
      if (this.waitingTimeBeforeCalling > 0) this.waitingTimeBeforeCalling -= 1;
    }, 1000);
  }

  isReadyForCollection() {
    return !this.collected && this.waitingTimeBeforeCalling === 0;
  }
}

export class FoodDistributionCenter extends Building {
  constructor(coordinates) {
    super(coordinates);
    this.food = 0;
  }

  addOccupant(occupantId) {
    this.occupants.push(occupantId);
  }

  removeOccupant(occupantId) {
    this.occupants = this.occupants.filter(
      (occupant) => occupant !== occupantId
    );
  }

  addFood(food) {
    this.food += food;
  }
}

export class InspectionCenter extends Building {}
export class ReallocationCenter extends Building {
  addOccupants(occupants) {
    this.occupants.push(...occupants.map((occupant) => occupant.id));
  }

  removeOccupant(occupantId) {
    this.occupants = this.occupants.filter(
      (occupant) => occupant !== occupantId
    );
  }
}
