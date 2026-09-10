cmake_minimum_required(VERSION 3.16)

project(cool-retro-term VERSION 1.2.0 LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Quick Widgets Qml Network Sql QuickControls2 ShaderTools)

add_subdirectory(qmltermwidget)
add_subdirectory(app)

if(UNIX AND NOT APPLE)
    install(FILES cool-retro-term.desktop DESTINATION share/applications)
    install(FILES icons/32x32/cool-retro-term.png DESTINATION share/icons/hicolor/32x32/apps)
    install(FILES icons/64x64/cool-retro-term.png DESTINATION share/icons/hicolor/64x64/apps)
    install(FILES icons/128x128/cool-retro-term.png DESTINATION share/icons/hicolor/128x128/apps)
    install(FILES icons/256x256/cool-retro-term.png DESTINATION share/icons/hicolor/256x256/apps)
endif()
