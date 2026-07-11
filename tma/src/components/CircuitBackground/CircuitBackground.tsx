import React, { useEffect, useRef, useCallback } from 'react';

interface CircuitBackgroundProps {
  theme?: 'dark' | 'light';
  className?: string;
}

interface Node {
  id: string;
  x: number;
  y: number;
  row: number;
  col: number;
  radius: number;
  connections: string[];
}

interface Impulse {
  id: string;
  currentNode: Node;
  targetNode: Node;
  progress: number;
  speed: number;
  trail: { x: number; y: number; alpha: number }[];
  maxTrailLength: number;
  turnProbability: number;
  generation: number;
}

interface TonPopup {
  id: string;
  x: number;
  y: number;
  alpha: number;
  lifetime: number;
  maxLifetime: number;
  label: string;
}

// Новый интерфейс для анимации переключения рельсов
interface RailSwitch {
  id: string;
  zoneIndex: number; // Индекс зоны (0-7)
  pivotNode: Node;   // Нижний узел, вокруг которого происходит поворот (опорная точка)
  currentDiagonalNode: Node; // Текущий верхний узел диагонали
  targetDiagonalNode: Node;  // Целевой верхний узел диагонали (после поворота на 90°)
  progress: number;  // Прогресс анимации (0-1)
  duration: number;  // Длительность анимации в мс
  startTime: number; // Время начала анимации
  active: boolean;   // Активна ли анимация
  direction: 'clockwise' | 'counterclockwise'; // Направление поворота
}

const CircuitBackground: React.FC<CircuitBackgroundProps> = ({
  theme = 'dark',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const impulsesRef = useRef<Impulse[]>([]);
  const tonPopupsRef = useRef<TonPopup[]>([]);
  const railSwitchesRef = useRef<RailSwitch[]>([]);
  const configRef = useRef({ rows: 24, cols: 24, width: 0, height: 0 });
  const switchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const colors = {
    dark: {
      background: '#121212',
      tracks: '#2a2a2a',
      nodes: '#3a3a3a',
      impulse: '#ffd700',
      trail: 'rgba(255, 215, 0, 0.8)',
      electricGlow: 'rgba(255, 215, 0, 0.4)',
      nodeGlow: 'rgba(255, 215, 0, 0.9)',
      text: '#ffffff',
      railSwitch: '#ffffff', // Белый для переключения рельсов в темной теме
      railSwitchGlow: 'rgba(255, 255, 255, 0.8)',
      railSwitchLine: '#ffffff' // Белые линии
    },
    light: {
      background: '#f8fafc',
      tracks: '#e2e8f0',
      nodes: '#cbd5e1',
      impulse: '#3b82f6',
      trail: 'rgba(59, 130, 246, 0.8)',
      electricGlow: 'rgba(59, 130, 246, 0.4)',
      nodeGlow: 'rgba(59, 130, 246, 0.9)',
      text: '#000000',
      railSwitch: '#1a1a1a', // Темно-серый для светлой темы
      railSwitchGlow: 'rgba(26, 26, 26, 0.8)',
      railSwitchLine: '#333333' // Темно-серые линии (темнее сетки)
    }
  } as const;

  const currentColors = colors[theme];

  const popupLabels = ['.mail', '.song', '.minter', '.9999', '.tondev', '.fund', '.7777', '.sender', '.deal', '.operator', '.ton'];

  // Создание сетки
  const createDetailedGrid = (width: number, height: number, rows: number, cols: number): Node[] => {
    const nodes: Node[] = [];
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;

        nodes.push({
          id: `node-${row}-${col}`,
          row,
          col,
          x,
          y,
          radius: Math.max(1, Math.min(2.5, Math.min(cellWidth, cellHeight) * 0.06)),
          connections: []
        });
      }
    }

    return nodes;
  };

  const createConnections = (nodes: Node[], rows: number, cols: number): void => {
    nodes.forEach(node => {
      const { row, col } = node;

      const directions = [
        { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
      ];

      directions.forEach(({ dr, dc }) => {
        const targetRow = row + dr;
        const targetCol = col + dc;

        if (targetRow >= 0 && targetRow < rows && targetCol >= 0 && targetCol < cols) {
          const targetId = `node-${targetRow}-${targetCol}`;
          const targetNode = nodes.find(n => n.id === targetId);

          if (targetNode && Math.random() > 0.2) {
            if (!node.connections.includes(targetId)) node.connections.push(targetId);
            if (!targetNode.connections.includes(node.id)) targetNode.connections.push(node.id);
          }
        }
      });
    });
  };

  // Функция для получения узлов в определенной зоне
  const getNodesInZone = (nodes: Node[], zoneIndex: number, width: number, height: number): Node[] => {
    const zones = {
      rows: 4, // 4 горизонтальные зоны
      cols: 2  // 2 вертикальные зоны
    };
    
    const zoneHeight = height / zones.rows;
    const zoneWidth = width / zones.cols;
    
    const zoneRow = Math.floor(zoneIndex / zones.cols);
    const zoneCol = zoneIndex % zones.cols;
    
    const minY = zoneRow * zoneHeight;
    const maxY = (zoneRow + 1) * zoneHeight;
    const minX = zoneCol * zoneWidth;
    const maxX = (zoneCol + 1) * zoneWidth;
    
    return nodes.filter(node => 
      node.x >= minX && node.x <= maxX && 
      node.y >= minY && node.y <= maxY
    );
  };

  const findSquareWithDiagonal = (nodes: Node[], zoneNodes: Node[]): { pivot: Node, current: Node, target: Node } | null => {
  // Ищем узлы, которые могут образовывать квадраты с диагоналями
  for (const node of zoneNodes) {
    // Проверяем, что узел не на самой границе
    if (node.row < 2 || node.row > configRef.current.rows - 3 || 
        node.col < 2 || node.col > configRef.current.cols - 3) {
      continue;
    }
    
    // Находим возможные диагональные соединения от этого узла
    const diagonalConnections = node.connections
      .map(id => nodes.find(n => n.id === id))
      .filter((n): n is Node => !!n)
      .filter(target => {
        // Проверяем, что это диагональное соединение (разница и по row и по col)
        const rowDiff = Math.abs(target.row - node.row);
        const colDiff = Math.abs(target.col - node.col);
        return rowDiff === 1 && colDiff === 1;
      });
    
    if (diagonalConnections.length === 0) continue;
    
    // Выбираем случайную диагональ
    const currentDiagonalNode = diagonalConnections[Math.floor(Math.random() * diagonalConnections.length)];
    
    // Определяем направление диагонали
    const isTopRight = currentDiagonalNode.row < node.row && currentDiagonalNode.col > node.col;
    const isTopLeft = currentDiagonalNode.row < node.row && currentDiagonalNode.col < node.col;
    // const isBottomRight = currentDiagonalNode.row > node.row && currentDiagonalNode.col > node.col;
    // const isBottomLeft = currentDiagonalNode.row > node.row && currentDiagonalNode.col < node.col;
    
    // Нас интересуют только диагонали, где текущий узел - нижний
    if (!isTopRight && !isTopLeft) continue;
    
    // Находим возможную зеркальную диагональ (поворот на 90°)
    let targetDiagonalNode: Node | null = null; // Оставляем null
    // let direction: 'clockwise' | 'counterclockwise' = 'clockwise';
    
    if (isTopRight) {
      // Текущая диагональ: нижний левый -> верхний правый
      // Зеркальная диагональ: нижний левый -> верхний левый (поворот против часовой)
      targetDiagonalNode = nodes.find(n => 
        n.row === node.row - 1 && n.col === node.col - 1
      ) || null; // Добавьте || null
      // direction = 'counterclockwise';
    } else if (isTopLeft) {
      // Текущая диагональ: нижний правый -> верхний левый
      // Зеркальная диагональ: нижний правый -> верхний правый (поворот по часовой)
      targetDiagonalNode = nodes.find(n => 
        n.row === node.row - 1 && n.col === node.col + 1
      ) || null; // Добавьте || null
      // direction = 'clockwise';
    }
    
    // Проверяем, что целевой узел существует и соединен с опорным
    if (targetDiagonalNode && node.connections.includes(targetDiagonalNode.id)) {
      return {
        pivot: node,
        current: currentDiagonalNode,
        target: targetDiagonalNode
      };
    }
  }
  
  return null;
};


  // Функция для создания анимации переключения рельсов
  const createRailSwitch = (nodes: Node[], width: number, height: number): RailSwitch | null => {
    const zones = 8; // 2 вертикальных × 4 горизонтальных
    const zoneIndex = Math.floor(Math.random() * zones);
    
    // Вероятность 33% для срабатывания в зоне
    if (Math.random() > 0.33) return null;
    
    const zoneNodes = getNodesInZone(nodes, zoneIndex, width, height);
    if (zoneNodes.length < 4) return null;
    
    // Ищем квадрат с диагональными соединениями
    const square = findSquareWithDiagonal(nodes, zoneNodes);
    if (!square) return null;
    
    const { pivot, current, target } = square;
    
    // Определяем направление поворота
    const direction = Math.random() > 0.5 ? 'clockwise' : 'counterclockwise';
    
    return {
      id: `rail-switch-${Date.now()}-${Math.random()}`,
      zoneIndex,
      pivotNode: pivot,
      currentDiagonalNode: current,
      targetDiagonalNode: target,
      progress: 0,
      duration: 1200 + Math.random() * 600, // 1200-1800ms
      startTime: Date.now(),
      active: true,
      direction
    };
  };

  // Функция для запуска цикла переключений
  const startSwitchCycle = useCallback((nodes: Node[], width: number, height: number) => {
    if (switchIntervalRef.current) {
      clearInterval(switchIntervalRef.current);
    }
    
    // Запускаем цикл каждые 5 секунд
    switchIntervalRef.current = setInterval(() => {
      const switchesCount = 3 + Math.floor(Math.random() * 6); // 3-8 переключений
      
      // Создаем переключения с задержкой
      for (let i = 0; i < switchesCount; i++) {
        setTimeout(() => {
          const railSwitch = createRailSwitch(nodes, width, height);
          if (railSwitch) {
            railSwitchesRef.current = [...railSwitchesRef.current, railSwitch];
          }
        }, i * 350); // Задержка 350ms между переключениями
      }
    }, 5000); // 5 секунд между циклами
  }, []);

  const findNextNode = (currentNode: Node, nodes: Node[], turnProbability: number): { node: Node | null, isSharpTurn: boolean } => {
    const possibleNext = currentNode.connections
      .map(id => nodes.find(n => n.id === id))
      .filter((n): n is Node => !!n)
      .filter(nextNode => nextNode.y < currentNode.y);

    if (possibleNext.length === 0) return { node: null, isSharpTurn: false };

    const sortedNext = possibleNext.sort((a, b) => Math.abs(a.x - currentNode.x) - Math.abs(b.x - currentNode.x));

    const shouldTurn = Math.random() < turnProbability && possibleNext.length > 1;

    if (shouldTurn) {
      const turningNode = possibleNext.reduce((max, node) => (Math.abs(node.x - currentNode.x) > Math.abs(max.x - currentNode.x) ? node : max), possibleNext[0]);
      const isSharpTurn = Math.abs(turningNode.x - currentNode.x) > 20;
      return { node: turningNode, isSharpTurn };
    }

    return { node: sortedNext[0], isSharpTurn: false };
  };

  const createImpulses = (nodes: Node[], width: number, rows: number): Impulse[] => {
    const impulses: Impulse[] = [];
    const impulseCount = 7;
    const spacing = width / (impulseCount + 1);

    const bottomNodes = nodes.filter(node => node.row >= rows - 2);
    if (bottomNodes.length === 0) return impulses;

    for (let i = 1; i <= impulseCount; i++) {
      const targetX = i * spacing;
      const closestStartNode = bottomNodes.reduce((closest, node) => Math.abs(node.x - targetX) < Math.abs(closest.x - targetX) ? node : closest, bottomNodes[0]);
      const { node: nextNode } = findNextNode(closestStartNode, nodes, 0.5);

      if (nextNode) {
        impulses.push({
          id: `impulse-${i}`,
          currentNode: closestStartNode,
          targetNode: nextNode,
          progress: 0,
          speed: 0.02 + Math.random() * 0.01,
          trail: [],
          maxTrailLength: 25,
          turnProbability: 0.5,
          generation: 0
        });
      }
    }

    return impulses;
  };

  const splitImpulse = (impulse: Impulse, nodes: Node[], impulses: Impulse[]): void => {
    if (impulse.generation >= 2) return;

    const currentNode = impulse.targetNode;
    const possibleDirections = currentNode.connections
      .map(id => nodes.find(n => n.id === id))
      .filter((n): n is Node => !!n)
      .filter(nextNode => nextNode.y < currentNode.y);

    if (possibleDirections.length >= 2) {
      const splitCount = Math.min(2, possibleDirections.length);
      for (let i = 0; i < splitCount; i++) {
        const targetNode = possibleDirections[i];
        impulses.push({
          id: `impulse-${impulses.length}`,
          currentNode,
          targetNode,
          progress: 0,
          speed: impulse.speed * (0.8 + Math.random() * 0.4),
          trail: [],
          maxTrailLength: 20,
          turnProbability: 0.6,
          generation: impulse.generation + 1
        });
      }
    }
  };

  // Функция для рисования анимации переключения рельсов с поворотом
  const drawRailSwitch = (ctx: CanvasRenderingContext2D, railSwitch: RailSwitch) => {
    const { pivotNode, currentDiagonalNode, targetDiagonalNode, progress, direction } = railSwitch;
    
    // Вычисляем текущее положение анимации с easing
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Кубическое easing
    
    // Цвета для анимации
    const lineColor = currentColors.railSwitchLine;
    const glowColor = currentColors.railSwitchGlow;
    
    // Вычисляем угол поворота (от 0 до 90 градусов)
    const angle = (direction === 'clockwise' ? 1 : -1) * (easeProgress * Math.PI / 2);
    
    // Вектор от опорного узла к текущему диагональному узлу
    const currentVector = {
      x: currentDiagonalNode.x - pivotNode.x,
      y: currentDiagonalNode.y - pivotNode.y
    };
    
    // Вычисляем повернутый вектор
    const rotatedX = currentVector.x * Math.cos(angle) - currentVector.y * Math.sin(angle);
    const rotatedY = currentVector.x * Math.sin(angle) + currentVector.y * Math.cos(angle);
    
    // Конечная точка поворачивающейся линии
    const rotatedEndX = pivotNode.x + rotatedX;
    const rotatedEndY = pivotNode.y + rotatedY;
    
    // Рисуем исходную диагональ (постепенно исчезает)
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1 - easeProgress * 0.9;
    ctx.beginPath();
    ctx.moveTo(pivotNode.x, pivotNode.y);
    ctx.lineTo(currentDiagonalNode.x, currentDiagonalNode.y);
    ctx.stroke();
    
    // Рисуем поворачивающуюся линию
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.3 + easeProgress * 0.7;
    ctx.beginPath();
    ctx.moveTo(pivotNode.x, pivotNode.y);
    ctx.lineTo(rotatedEndX, rotatedEndY);
    ctx.stroke();
    
    // Рисуем целевую диагональ (постепенно появляется)
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 4;
    ctx.globalAlpha = easeProgress * 0.8;
    ctx.beginPath();
    ctx.moveTo(pivotNode.x, pivotNode.y);
    ctx.lineTo(targetDiagonalNode.x, targetDiagonalNode.y);
    ctx.stroke();
    
    // Свечение вокруг опорного узла (нижнего)
    const pivotGlowRadius = 15 + easeProgress * 10;
    const pivotGlow = ctx.createRadialGradient(
      pivotNode.x, pivotNode.y, 0,
      pivotNode.x, pivotNode.y, pivotGlowRadius
    );
    pivotGlow.addColorStop(0, glowColor);
    pivotGlow.addColorStop(1, 'transparent');
    
    ctx.fillStyle = pivotGlow;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(pivotNode.x, pivotNode.y, pivotGlowRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Свечение вокруг текущего диагонального узла (исчезает)
    const currentGlowRadius = 12 * (1 - easeProgress);
    if (currentGlowRadius > 0) {
      const currentGlow = ctx.createRadialGradient(
        currentDiagonalNode.x, currentDiagonalNode.y, 0,
        currentDiagonalNode.x, currentDiagonalNode.y, currentGlowRadius
      );
      currentGlow.addColorStop(0, glowColor);
      currentGlow.addColorStop(1, 'transparent');
      
      ctx.fillStyle = currentGlow;
      ctx.globalAlpha = 0.5 * (1 - easeProgress);
      ctx.beginPath();
      ctx.arc(currentDiagonalNode.x, currentDiagonalNode.y, currentGlowRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Свечение вокруг целевого диагонального узла (появляется)
    const targetGlowRadius = 12 * easeProgress;
    if (targetGlowRadius > 0) {
      const targetGlow = ctx.createRadialGradient(
        targetDiagonalNode.x, targetDiagonalNode.y, 0,
        targetDiagonalNode.x, targetDiagonalNode.y, targetGlowRadius
      );
      targetGlow.addColorStop(0, glowColor);
      targetGlow.addColorStop(1, 'transparent');
      
      ctx.fillStyle = targetGlow;
      ctx.globalAlpha = 0.5 * easeProgress;
      ctx.beginPath();
      ctx.arc(targetDiagonalNode.x, targetDiagonalNode.y, targetGlowRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Дополнительное свечение на конце поворачивающейся линии
    const rotatingGlowRadius = 8;
    const rotatingGlow = ctx.createRadialGradient(
      rotatedEndX, rotatedEndY, 0,
      rotatedEndX, rotatedEndY, rotatingGlowRadius
    );
    rotatingGlow.addColorStop(0, glowColor);
    rotatingGlow.addColorStop(1, 'transparent');
    
    ctx.fillStyle = rotatingGlow;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(rotatedEndX, rotatedEndY, rotatingGlowRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.globalAlpha = 1;
  };

  // Инициализация
  const init = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = window.innerWidth;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    const height = documentHeight;

    const targetCell = 40;
    const cols = Math.max(12, Math.floor(width / targetCell));
    const rows = Math.max(12, Math.floor(height / targetCell));

    configRef.current = { rows, cols, width, height };

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    container.style.height = `${height}px`;

    const nodes = createDetailedGrid(width, height, rows, cols);
    createConnections(nodes, rows, cols);
    const impulses = createImpulses(nodes, width, rows);
    const tonPopups: TonPopup[] = [];
    const railSwitches: RailSwitch[] = [];

    nodesRef.current = nodes;
    impulsesRef.current = impulses;
    tonPopupsRef.current = tonPopups;
    railSwitchesRef.current = railSwitches;

    // Запускаем цикл переключений
    startSwitchCycle(nodes, width, height);

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const drawCircuit = () => {
      const nodes = nodesRef.current;
      const impulses = impulsesRef.current;
      const tonPopups = tonPopupsRef.current;
      const railSwitches = railSwitchesRef.current;
      const currentTime = Date.now();

      ctx.clearRect(0, 0, width, height);

      // Фон
      ctx.fillStyle = currentColors.background;
      ctx.fillRect(0, 0, width, height);

      // Соединения
      nodes.forEach(node => {
        node.connections.forEach(connectionId => {
          const targetNode = nodes.find(n => n.id === connectionId);
          if (targetNode && node.id < targetNode.id) {
            ctx.strokeStyle = currentColors.tracks;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(targetNode.x, targetNode.y);
            ctx.stroke();
          }
        });
      });

      // Узлы
      nodes.forEach(node => {
        ctx.fillStyle = currentColors.nodes;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = currentColors.background;
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(0, node.radius - 0.3), 0, 2 * Math.PI);
        ctx.fill();
      });

      // Анимации переключения рельсов
      for (let i = railSwitches.length - 1; i >= 0; i--) {
        const railSwitch = railSwitches[i];
        
        if (railSwitch.active) {
          const elapsed = currentTime - railSwitch.startTime;
          railSwitch.progress = Math.min(1, elapsed / railSwitch.duration);
          
          drawRailSwitch(ctx, railSwitch);
          
          // Завершаем анимацию
          if (railSwitch.progress >= 1) {
            railSwitches.splice(i, 1);
          }
        }
      }

      // Popups
      for (let i = tonPopups.length - 1; i >= 0; i--) {
        const popup = tonPopups[i];
        popup.lifetime++;
        popup.alpha = 1 - popup.lifetime / popup.maxLifetime;

        if (popup.lifetime >= popup.maxLifetime) {
          tonPopups.splice(i, 1);
        } else {
          ctx.font = 'bold 14px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = currentColors.text;
          ctx.globalAlpha = popup.alpha;
          ctx.fillText(popup.label, popup.x, popup.y - 20);

          const glowGradient = ctx.createRadialGradient(popup.x, popup.y, 0, popup.x, popup.y, 25);
          glowGradient.addColorStop(0, currentColors.impulse);
          glowGradient.addColorStop(1, 'transparent');

          ctx.fillStyle = glowGradient;
          ctx.globalAlpha = popup.alpha * 0.3;
          ctx.beginPath();
          ctx.arc(popup.x, popup.y, 25, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      // Импульсы
      for (let idx = 0; idx < impulses.length; idx++) {
        const impulse = impulses[idx];
        const from = impulse.currentNode;
        const to = impulse.targetNode;

        const currentX = from.x + (to.x - from.x) * impulse.progress;
        const currentY = from.y + (to.y - from.y) * impulse.progress;

        impulse.trail.unshift({ x: currentX, y: currentY, alpha: 1 });
        if (impulse.trail.length > impulse.maxTrailLength) impulse.trail.pop();
        impulse.trail.forEach((point, i) => point.alpha = 1 - i / impulse.trail.length);

        if (impulse.trail.length > 1) {
          ctx.strokeStyle = currentColors.trail;
          ctx.lineCap = 'round';
          ctx.lineWidth = 2.5 - impulse.generation * 0.5;

          for (let i = 0; i < impulse.trail.length - 1; i++) {
            const cur = impulse.trail[i];
            const next = impulse.trail[i + 1];
            ctx.globalAlpha = cur.alpha * 0.8;
            ctx.beginPath();
            ctx.moveTo(cur.x, cur.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        const headSize = Math.max(2, 7 - impulse.generation);
        const headGradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, headSize);
        headGradient.addColorStop(0, currentColors.impulse);
        headGradient.addColorStop(0.7, currentColors.trail);
        headGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.arc(currentX, currentY, headSize, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = currentColors.impulse;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 2, 0, 2 * Math.PI);
        ctx.fill();

        impulse.progress += impulse.speed;

        if (impulse.progress >= 1) {
          impulse.progress = 0;
          const { node: nextNode, isSharpTurn } = findNextNode(to, nodes, impulse.turnProbability);

          if (nextNode) {
            if (isSharpTurn && Math.random() > 0.7) {
              tonPopups.push({
                id: `popup-${Date.now()}-${Math.random()}`,
                x: to.x,
                y: to.y,
                alpha: 1,
                lifetime: 0,
                maxLifetime: 60,
                label: popupLabels[Math.floor(Math.random() * popupLabels.length)]
              });

              if (impulses.length < 60) splitImpulse(impulse, nodes, impulses);
            }

            impulse.currentNode = to;
            impulse.targetNode = nextNode;
          } else {
            const bottomNodes = nodes.filter(n => n.row >= (configRef.current.rows - 2));
            if (bottomNodes.length > 0) {
              const newStart = bottomNodes[Math.floor(Math.random() * bottomNodes.length)];
              const { node: newNext } = findNextNode(newStart, nodes, 0.5);
              if (newNext) {
                impulse.currentNode = newStart;
                impulse.targetNode = newNext;
                impulse.trail = [];
                impulse.generation = 0;
              }
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(drawCircuit);
    };

    drawCircuit();
  }, [currentColors, startSwitchCycle]);

  useEffect(() => {
    init();

    let resizeTimeout: number | null = null;

    const handleResize = () => {
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        init();
      }, 120);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    let ro: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => handleResize());
      ro.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
      if (ro) ro.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (switchIntervalRef.current) clearInterval(switchIntervalRef.current);
    };
  }, [init]);

  return (
    <div
      ref={containerRef}
      className={`fixed top-0 left-0 w-full pointer-events-none ${className}`}
      style={{ zIndex: -1, position: 'fixed' }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default CircuitBackground;