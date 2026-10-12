import React from 'react';
import {Composition} from 'remotion';
import {CountryShort} from './CountryShort';
// Quiz-Short „Guess the Country“ in Remotion (Niklas 12.10.): 15 s, 1080x1920, 30 fps. Props kommen per --props (mkprops.py).
export const Root: React.FC = () => (
  <Composition id="CountryShort" component={CountryShort as any} durationInFrames={450} fps={30} width={1080} height={1920}
    defaultProps={{code: 'MG', country: 'Madagascar', cap: 'Antananarivo', cont: 'Africa', nv: true, d: 'M0 0', world: 'M0 0', dotx: 0, doty: 0}} />
);
