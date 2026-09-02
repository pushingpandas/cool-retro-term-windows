cmake_minimum_required(VERSION 3.16)

project(cool-retro-term-app LANGUAGES CXX C)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Quick Widgets Qml Sql QuickControls2 ShaderTools)

execute_process(
    COMMAND git -C "${CMAKE_CURRENT_SOURCE_DIR}/.." describe --tags --always --dirty=-dirty
    OUTPUT_VARIABLE APP_VERSION
    OUTPUT_STRIP_TRAILING_WHITESPACE
    ERROR_QUIET
)
if(NOT APP_VERSION)
    set(APP_VERSION "unknown")
endif()

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../KDSingleApplication/CMakeLists.txt")
    add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../KDSingleApplication" "${CMAKE_CURRENT_BINARY_DIR}/KDSingleApplication" EXCLUDE_FROM_ALL)
    set(KDSINGLEAPP_LIB kdsingleapplication)
else()
    add_library(kdsingleapplication STATIC
        "${CMAKE_CURRENT_SOURCE_DIR}/../KDSingleApplication/src/kdsingleapplication.cpp"
        "${CMAKE_CURRENT_SOURCE_DIR}/../KDSingleApplication/src/kdsingleapplication_localsocket.cpp"
    )
    target_include_directories(kdsingleapplication PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/../KDSingleApplication/src")
    target_compile_definitions(kdsingleapplication PUBLIC KDSINGLEAPPLICATION_STATIC_BUILD)
    target_link_libraries(kdsingleapplication PUBLIC Qt6::Core Qt6::Network)
    set(KDSINGLEAPP_LIB kdsingleapplication)
endif()

set(APP_SOURCES
    main.cpp
    fileio.cpp
    fontmanager.cpp
    fontlistmodel.cpp
    qml/resources.qrc
)

set(APP_HEADERS
    fileio.h
    fontmanager.h
    fontlistmodel.h
)

find_program(QSB_EXECUTABLE qsb HINTS ${Qt6_DIR}/../../../bin)
if(NOT QSB_EXECUTABLE)
    if(TARGET Qt6::qsb)
        get_target_property(QSB_EXECUTABLE Qt6::qsb LOCATION)
    else()
        set(QSB_EXECUTABLE qsb)
    endif()
endif()

set(SHADERS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/shaders")
file(GLOB ALL_FRAG_SHADERS "${SHADERS_DIR}/*.frag")
file(GLOB ALL_VERT_SHADERS "${SHADERS_DIR}/*.vert")

set(EXCLUDE_SHADERS
    "${SHADERS_DIR}/terminal_dynamic.frag"
    "${SHADERS_DIR}/terminal_static.frag"
    "${SHADERS_DIR}/passthrough.vert"
)

set(BASE_SHADERS ${ALL_FRAG_SHADERS} ${ALL_VERT_SHADERS})
list(REMOVE_ITEM BASE_SHADERS ${EXCLUDE_SHADERS})

set(COMPILED_QSB_FILES)

foreach(SHADER ${BASE_SHADERS})
    get_filename_component(SHADER_NAME ${SHADER} NAME)
    set(OUTPUT_QSB "${CMAKE_CURRENT_SOURCE_DIR}/shaders/${SHADER_NAME}.qsb")
    add_custom_command(
        OUTPUT ${OUTPUT_QSB}
        COMMAND ${QSB_EXECUTABLE} --glsl "100 es,120,150" --hlsl 51 --msl 12 --qt6 -o ${OUTPUT_QSB} ${SHADER}
        DEPENDS ${SHADER}
        COMMENT "Compiling shader ${SHADER_NAME}"
    )
    list(APPEND COMPILED_QSB_FILES ${OUTPUT_QSB})
endforeach()

set(DYNAMIC_SHADER "${SHADERS_DIR}/terminal_dynamic.frag")
foreach(RASTER_MODE RANGE 0 4)
    foreach(BURN_IN RANGE 0 1)
        foreach(DISPLAY_FRAME RANGE 0 1)
            foreach(CHROMA_ON RANGE 0 1)
                set(DYNAMIC_VARIANT "terminal_dynamic_raster${RASTER_MODE}_burn${BURN_IN}_frame${DISPLAY_FRAME}_chroma${CHROMA_ON}")
                set(OUTPUT_QSB "${SHADERS_DIR}/${DYNAMIC_VARIANT}.frag.qsb")
                add_custom_command(
                    OUTPUT ${OUTPUT_QSB}
                    COMMAND ${QSB_EXECUTABLE} --glsl "100 es,120,150" --hlsl 51 --msl 12 --qt6
                        -DCRT_RASTER_MODE=${RASTER_MODE}
                        -DCRT_BURN_IN=${BURN_IN}
                        -DCRT_DISPLAY_FRAME=${DISPLAY_FRAME}
                        -DCRT_CHROMA=${CHROMA_ON}
                        -o ${OUTPUT_QSB} ${DYNAMIC_SHADER}
                    DEPENDS ${DYNAMIC_SHADER}
                    COMMENT "Compiling dynamic shader variant ${DYNAMIC_VARIANT}"
                )
                list(APPEND COMPILED_QSB_FILES ${OUTPUT_QSB})
            endforeach()
        endforeach()
    endforeach()
endforeach()

set(STATIC_SHADER "${SHADERS_DIR}/terminal_static.frag")
foreach(RGB_SHIFT RANGE 0 1)
    foreach(BLOOM_ON RANGE 0 1)
        foreach(CURVE_ON RANGE 0 1)
            foreach(SHINE_ON RANGE 0 1)
                set(STATIC_VARIANT "terminal_static_rgb${RGB_SHIFT}_bloom${BLOOM_ON}_curve${CURVE_ON}_shine${SHINE_ON}")
                set(OUTPUT_QSB "${SHADERS_DIR}/${STATIC_VARIANT}.frag.qsb")
                add_custom_command(
                    OUTPUT ${OUTPUT_QSB}
                    COMMAND ${QSB_EXECUTABLE} --glsl "100 es,120,150" --hlsl 51 --msl 12 --qt6
                        -DCRT_RGB_SHIFT=${RGB_SHIFT}
                        -DCRT_BLOOM=${BLOOM_ON}
                        -DCRT_CURVATURE=${CURVE_ON}
                        -DCRT_FRAME_SHININESS=${SHINE_ON}
                        -o ${OUTPUT_QSB} ${STATIC_SHADER}
                    DEPENDS ${STATIC_SHADER}
                    COMMENT "Compiling static shader variant ${STATIC_VARIANT}"
                )
                list(APPEND COMPILED_QSB_FILES ${OUTPUT_QSB})
            endforeach()
        endforeach()
    endforeach()
endforeach()

add_custom_target(compile_shaders ALL DEPENDS ${COMPILED_QSB_FILES})

add_executable(cool-retro-term WIN32 ${APP_SOURCES} ${APP_HEADERS})
add_dependencies(cool-retro-term compile_shaders qmltermwidget_assets)

target_compile_definitions(cool-retro-term PRIVATE APP_VERSION="${APP_VERSION}")

target_include_directories(cool-retro-term PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../qmltermwidget/src
    ${CMAKE_CURRENT_SOURCE_DIR}/../qmltermwidget/lib
)

target_link_libraries(cool-retro-term PRIVATE
    Qt6::Core
    Qt6::Quick
    Qt6::Widgets
    Qt6::Qml
    Qt6::Sql
    Qt6::QuickControls2
    qmltermwidget
    ${KDSINGLEAPP_LIB}
)

if(WIN32)
    target_compile_definitions(cool-retro-term PRIVATE _WIN32_WINNT=0x0A00 NTDDI_VERSION=0x0A000006)
    target_link_libraries(cool-retro-term PRIVATE advapi32)
endif()

if(UNIX AND NOT APPLE)
    install(TARGETS cool-retro-term DESTINATION bin)
endif()
