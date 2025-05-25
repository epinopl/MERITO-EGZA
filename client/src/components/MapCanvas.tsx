/// <reference types="p5" />
import { useEffect, useRef } from 'react';
import p5 from 'p5';

// Typy
type Node = {
  id: string;
  name: string;
  x: number;
  y: number;
};

type Edge = { from: string; to: string; dist: number };

type AntPath = {
  path: string[];
  totalDistance: number;
};

// Węzły
const nodes: Node[] = [
  { id: "MR1", name: "Najwyższe Mrowisko", x: 150, y: 350 },
  { id: "BG1", name: "Bagna Koralowe", x: 180, y: 1250 },
  { id: "RC1", name: "Bród - Rzeka Dwóch Cieni", x: 450, y: 800 },
  { id: "LB1", name: "Labirynt Pięciu Dolin", x: 500, y: 700 },
  { id: "BST", name: "Baszta Zmierzchu - Góry Mgliste", x: 870, y: 240 },
  { id: "CT1", name: "Zamek Verdantii", x: 830, y: 1370 },
];

// Krawędzie
const generateRandomEdges = (nodes: Node[], count: number): Edge[] => {
  const possiblePairs: { from: string; to: string }[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      possiblePairs.push({ from: nodes[i].id, to: nodes[j].id });
    }
  }

  const shuffled = possiblePairs.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return selected.map(pair => ({
    ...pair,
    dist: parseFloat((Math.random() * 110 + 10).toFixed(2)),
  }));
};

const edges: Edge[] = generateRandomEdges(nodes, 9);

// ACO
const runACO = (
  nodes: Node[],
  edges: Edge[],
  startId: string,
  endId: string,
  antCount = 50,
  alpha = 1,
  beta = 5,
  evaporation = 0.5,
  iterations = 20
): AntPath => {
  const pheromones = new Map<string, number>();
  edges.forEach(edge => {
    const key = `${edge.from}-${edge.to}`;
    pheromones.set(key, 1);
    pheromones.set(`${edge.to}-${edge.from}`, 1);
  });

  let bestPath: AntPath = { path: [], totalDistance: Infinity };

  for (let iter = 0; iter < iterations; iter++) {
    const allAntPaths: AntPath[] = [];

    for (let ant = 0; ant < antCount; ant++) {
      const path: string[] = [startId];
      let totalDistance = 0;
      let current = startId;
      const visited = new Set<string>();
      visited.add(current);

      while (current !== endId) {
        const possibleEdges = edges.filter(e =>
          (e.from === current && !visited.has(e.to)) ||
          (e.to === current && !visited.has(e.from))
        );

        if (possibleEdges.length === 0) break;

        const weights = possibleEdges.map(e => {
          const next = e.from === current ? e.to : e.from;
          const pheromone = pheromones.get(`${e.from}-${e.to}`) ?? 1;
          const visibility = 1 / e.dist;
          return {
            edge: e,
            next,
            weight: Math.pow(pheromone, alpha) * Math.pow(visibility, beta),
          };
        });

        const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
        const rand = Math.random() * totalWeight;

        let chosen: string | null = null;
        let acc = 0;
        for (const w of weights) {
          acc += w.weight;
          if (acc >= rand) {
            chosen = w.next;
            totalDistance += w.edge.dist;
            path.push(chosen);
            visited.add(chosen);
            current = chosen;
            break;
          }
        }

        if (!chosen) break;
      }

      if (path.length > 0 && path[path.length - 1] === endId && totalDistance < Infinity) {
        allAntPaths.push({ path, totalDistance });
        if (totalDistance < bestPath.totalDistance) {
          bestPath = { path, totalDistance };
        }
      }
    }

    for (const key of pheromones.keys()) {
      pheromones.set(key, (pheromones.get(key) ?? 1) * (1 - evaporation));
    }

    for (const ant of allAntPaths) {
      for (let i = 0; i < ant.path.length - 1; i++) {
        const a = ant.path[i];
        const b = ant.path[i + 1];
        const key1 = `${a}-${b}`;
        const key2 = `${b}-${a}`;
        const delta = 1 / ant.totalDistance;
        pheromones.set(key1, (pheromones.get(key1) ?? 0) + delta);
        pheromones.set(key2, (pheromones.get(key2) ?? 0) + delta);
      }
    }
  }

  return bestPath;
};

// Komponent
export default function MapCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let fogOffset = 0;
    const bestPath = runACO(nodes, edges, "MR1", "CT1");

    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(1000, 1500);
        p.textFont('Georgia');
      };

      p.draw = () => {
        p.clear();

        // mgła
        p.noStroke();
        for (let x = 0; x < p.width; x += 10) {
          for (let y = 0; y < p.height; y += 10) {
            const n = p.noise(x * 0.005, y * 0.005, fogOffset);
            const alpha = p.map(n, 0, 1, 0, 40);
            p.fill(200, 220, 255, alpha);
            p.rect(x, y, 10, 10);
          }
        }
        fogOffset += 0.01;

        // krawędzie
        p.stroke(100);
        p.strokeWeight(2);
        edges.forEach(edge => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return;
          p.line(fromNode.x, fromNode.y, toNode.x, toNode.y);

          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          p.noStroke();
          p.fill(50);
          p.textSize(10);
          p.textAlign('center' as any);
          p.text(`${edge.dist}`, midX, midY - 5);
        });

        // węzły
        nodes.forEach(node => {
          p.fill(60, 120, 60);
          p.noStroke();
          p.ellipse(node.x, node.y, 25);
          p.fill(0);
          p.textSize(12);
          p.textAlign('center' as any);
          p.text(node.name, node.x, node.y - 10);
        });

        // 🔴 najlepsza ścieżka (Gruntor)
        p.stroke(255, 0, 0);
        p.strokeWeight(4);
        for (let i = 0; i < bestPath.path.length - 1; i++) {
          const from = nodes.find(n => n.id === bestPath.path[i]);
          const to = nodes.find(n => n.id === bestPath.path[i + 1]);
          if (from && to) {
            p.line(from.x, from.y, to.x, to.y);
          }
        }
      };
    };

    if (canvasRef.current) {
      const canvas = new p5(sketch, canvasRef.current);
      return () => canvas.remove();
    }

    return undefined;
  }, []);

  return <div ref={canvasRef} />;
}
