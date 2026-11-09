/*******************************************************************************
* Copyright (c) 2013-2021 "Filippo Scognamiglio"
* https://github.com/Swordfish90/cool-retro-term
*
* This file is part of cool-retro-term.
*
* cool-retro-term is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*******************************************************************************/
import QtQuick

QtObject {
    id: timeManager

    property bool enableTimer: false
    property real time: 0

    property int framesPerUpdate: Math.max(1, appSettings.effectsFrameSkip)
    property int _frameCounter: 0

    property var frameDriver: FrameAnimation {
        running: enableTimer
        onTriggered: {
            if (appSettings.classicCrt) {
                // 1.1.1 advances the effects clock in 50 ms steps by default.
                const classicTick = Math.floor(elapsedTime * 20) / 20
                if (classicTick > time)
                    time = classicTick
                return
            }
            timeManager._frameCounter += 1

            if (timeManager._frameCounter >= timeManager.framesPerUpdate) {
                time = elapsedTime
                timeManager._frameCounter = 0
            }
        }
    }

    onEnableTimerChanged: if (!enableTimer) _frameCounter = 0
    onFramesPerUpdateChanged: _frameCounter = 0
}
