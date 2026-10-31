// 3D objects for step cards: Microsoft Fluent Emoji 3D (MIT), see src/assets/fluent3d/NOTICE.md.
// Decorative only: cards always carry their own text.
import bulb from '../assets/fluent3d/bulb.webp';
import compass from '../assets/fluent3d/compass.webp';
import crane from '../assets/fluent3d/crane.webp';
import gear from '../assets/fluent3d/gear.webp';
import handshake from '../assets/fluent3d/handshake.webp';
import magnifier from '../assets/fluent3d/magnifier.webp';
import rocket from '../assets/fluent3d/rocket.webp';
import shield from '../assets/fluent3d/shield.webp';

export const OBJECTS_3D: Record<string, string> = { bulb, compass, crane, gear, handshake, magnifier, rocket, shield };

export const object3d = (key: string | undefined) => (key ? OBJECTS_3D[key.trim()] : undefined);
