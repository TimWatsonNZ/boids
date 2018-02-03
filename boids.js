const canvas = document.createElement('canvas');
const size = 500;

canvas.width=size;
canvas.height=size;

document.getElementById('root').appendChild(canvas);
const context = canvas.getContext('2d');


let intervalId = 0;

let boidNumber = 50;
let boidSpeed = 1;
let collisionRadius = 80;
let visionRadius = 120;
let maxRepulsion = 0.05;
let headingStrength = 0.05;
let cohesionStrength = 0.05;

document.getElementById('boidNumber').value = boidNumber;
document.getElementById('boidSpeed').value = boidSpeed
document.getElementById('collisionRadius').value = collisionRadius;
document.getElementById('visionRadius').value = visionRadius;
document.getElementById('repulsionStrength').value = maxRepulsion;
document.getElementById('headingStrength').value = headingStrength;
document.getElementById('cohesionStrength').value = cohesionStrength;

function start() {
  window.clearInterval(intervalId);

  boidNumber         = +document.getElementById('boidNumber').value;
  boidSpeed          = +document.getElementById('boidSpeed').value;
  collisionRadius    = +document.getElementById('collisionRadius').value;
  visionRadius       = +document.getElementById('visionRadius').value;
  maxRepulsion       = +document.getElementById('repulsionStrength').value;
  headingStrength    = +document.getElementById('headingStrength').value;
  cohesionStrength   = +document.getElementById('cohesionStrength').value;

  const boids = createBoids(boidNumber);
  intervalId = startInterval(boids);
}

function createBoids(boidNumber) {
  return [...Array(boidNumber)].map( (x, i) => {
    const position = Vector.createRandomVectorInRange(size);
    const vector = Vector.createRandomUnitVector();
    return {
      id: i, 
      p: position,
      v: vector,
    }
  });
}

function startInterval(boids) {
  return window.setInterval(() => {
    context.fillStyle = "rgb(255, 255,255)"
    context.fillRect(0, 0, size, size);
    context.fillStyle = "rgb(255, 0, 0)";
  
    boids.forEach(b => {
      drawBoid(b);
      updateBoid(b, boids);
    })
  }, 20);
}



class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  static createRandomUnitVector() {
    const vX = Math.random() * randomlyInvert();
    const vY = Math.sqrt(1 - vX * vX) * randomlyInvert();
    return new Vector(vX, vY);
  }

  static createRandomVectorInRange(xRange, yRange) {
    if (!yRange) yRange = xRange;

    return new Vector(Math.floor(Math.random() * xRange), Math.floor(Math.random() * yRange));
  }

  normalise() {
    const mag = Math.sqrt(this.x*this.x + this.y*this.y);
    this.x/= mag;
    this.y/= mag;

    return this;
  }

  add(vector, interpolateStength = 1, normalise = false) {
    const newVector = new Vector(this.x, this.y);

    const addX = interpolateStength * vector.x;
    const addY = interpolateStength * vector.y;
    newVector.x += addX;
    newVector.y += addY;
    
    if (normalise) newVector.normalise();
    return newVector;
  }

  sub(vector, interpolateStength = 1, normalise = false) {
    const newVector = new Vector(this.x, this.y);

    newVector.x -= interpolateStength * vector.x;
    newVector.y -= interpolateStength * vector.y;
    
    if (normalise) newVector.normalise();
    return newVector;
  }

  divide(divisor) {
    const newVector = new Vector(this.x, this.y);

    newVector.x /= divisor;
    newVector.y /= divisor;
    
    return newVector;
  }

  rotate(theta) {
    const x = this.x * Math.cos(theta) - this.y * Math.sin(theta);
    const y = this.x * Math.sin(theta) + this.y * Math.cos(theta);

    this.x = x;
    this.y = y;

    return this;
  }

  distance(vector) {
    return Math.sqrt(
      Math.pow(this.x - vector.x, 2) +
      Math.pow(this.y - vector.y)
    )
  }
}

const boidPoints = [
  new Vector(0, -2),
  new Vector(2, 2),
  new Vector(0, 1),
  new Vector(-2, 2)
];

function randomlyInvert() {
  return (Math.round(Math.random()) * 2 -1);
}

function findCollisions(boid, boids, radius) {
  const collisions = boids.reduce((allCollisions, current, index) => 
  {
    if (index === boid.id) {
      return allCollisions;
    }

    const collision = circleCollision(boid.p, current.p, radius);
    if (collision.isCollision) {
      allCollisions.push({ boid: current, distance: collision.distance });
    }
    return allCollisions;
  }, []);

  return collisions;
}

function circleCollision(p1, p2, radius) {
  const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2));

  return { isCollision: dist <= (2*radius), distance: dist };
}

function avoidBoundaries(boid) {
  if (boid.p.x < 0) {
    boid.v = boid.v.add(new Vector(0.075, 0), 1, true);
  }
  if (boid.p.x > size) {
    boid.v = boid.v.add(new Vector(-0.075, 0), 1, true);
  }
  if (boid.p.y < 0) {
    boid.v = boid.v.add(new Vector(0, 0.075), 1, true);
  }
  if (boid.p.y > size) {
    boid.v = boid.v.add(new Vector(0, -0.075), 1, true);
  }
}

function updateBoid(boid, boids) {
  avoidBoundaries(boid);
  
  const visionCollisions = findCollisions(boid, boids, visionRadius);
  const collisions = findCollisions(boid, boids, collisionRadius);

  if (collisions.length > 0) {
    let closestCollision = collisions[0];
    if (collisions.length > 1) {
      closestCollision = collisions.reduce( (closest, current) => {
        if (current.distance < closest.distance) {
          closest = current;
        }

        return closest;
      }, closestCollision)
    }

    const closest = closestCollision.boid;
    const repulsionVector = boid.p.sub(closest.p, 1, true);

    const replusiveForce = maxRepulsion * (1 - (closestCollision.distance/collisionRadius));
    boid.v = boid.v.add(repulsionVector, replusiveForce, true);
  }

  if (visionCollisions.length > 0) {
    const localAvgHeading = visionCollisions.reduce((heading, current) => {
      return heading.add(current.boid.v);
    }, new Vector(0, 0)).normalise();
    
    boid.v = boid.v.add(localAvgHeading, headingStrength, true);

    const averageLocalPosition = visionCollisions.reduce((heading, current) => {
      return heading.add(current.boid.p);
    }, new Vector(0, 0)).divide(visionCollisions.length);
  
    const vectorToLocalPosition = boid.p.sub(averageLocalPosition, 1, true);
    boid.v = boid.v.add(vectorToLocalPosition, cohesionStrength, true);
  }
  
  boid.p = boid.p.add(boid.v, boidSpeed);
}

function drawCircle(p, radius) {
  context.beginPath();
  context.arc(p.x, p.y, radius, 0, 2 * Math.PI);
  context.stroke();
}

function drawBoid(boid) {

  const norm = boid.v;
  norm.normalise();
  let theta = Math.atan(norm.x/-norm.y);

  if (boid.v.x > 0 && boid.v.y > 0) {
    theta += 1 * Math.PI;
  }

  if (boid.v.x < 0 && boid.v.y > 0) {
    theta += 1 * Math.PI;
  }

  const lookAheadDistance = 3 * collisionRadius;

  context.fillStyle = '#f00';
  context.beginPath();

  boidPoints.forEach( (p, i) => {

    const rp = new Vector(p.x, p.y).rotate(theta);
    if(i === 0) {
      context.moveTo(boid.p.x + rp.x, boid.p.y + rp.y);
    } else {
      context.lineTo(boid.p.x + rp.x, boid.p.y + rp.y);
    }
  });
  context.closePath();
  context.fill();
}
