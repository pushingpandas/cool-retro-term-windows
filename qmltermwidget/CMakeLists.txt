cmake_minimum_required(VERSION 3.16)

project(qmltermwidget LANGUAGES CXX C)

set(CMAKE_AUTOMOC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Quick Widgets Network)

set(QMLTERMWIDGET_SOURCES
    lib/BlockArray.cpp
    lib/ColorScheme.cpp
    lib/Emulation.cpp
    lib/Filter.cpp
    lib/History.cpp
    lib/HistorySearch.cpp
    lib/KeyboardTranslator.cpp
    lib/konsole_wcwidth.cpp
    lib/ProcessInfo.cpp
    lib/Pty.cpp
    lib/Screen.cpp
    lib/ScreenWindow.cpp
    lib/Session.cpp
    lib/ShellCommand.cpp
    lib/TerminalCharacterDecoder.cpp
    lib/TerminalDisplay.cpp
    lib/tools.cpp
    lib/Vt102Emulation.cpp
    lib/ksession.cpp
    lib/kprocess.cpp
    src/qmltermwidget_plugin.cpp
)

set(QMLTERMWIDGET_HEADERS
    lib/BlockArray.h
    lib/CharacterColor.h
    lib/Character.h
    lib/ColorScheme.h
    lib/ColorTables.h
    lib/DefaultTranslatorText.h
    lib/Emulation.h
    lib/ExtendedDefaultTranslator.h
    lib/Filter.h
    lib/History.h
    lib/HistorySearch.h
    lib/KeyboardTranslator.h
    lib/konsole_wcwidth.h
    lib/LineFont.h
    lib/Pty.h
    lib/ProcessInfo.h
    lib/Screen.h
    lib/ScreenWindow.h
    lib/Session.h
    lib/ShellCommand.h
    lib/TerminalCharacterDecoder.h
    lib/TerminalDisplay.h
    lib/tools.h
    lib/Vt102Emulation.h
    lib/mac-vkcode.h
    lib/ksession.h
    lib/ringbuffer.h
    lib/kprocess.h
    src/qmltermwidget_plugin.h
)

if(WIN32)
    list(APPEND QMLTERMWIDGET_SOURCES
        lib/conpty.cpp
        lib/conptyprocess.cpp
        lib/conptydevice.cpp
    )
    list(APPEND QMLTERMWIDGET_HEADERS
        lib/conpty.h
        lib/conptyprocess.h
        lib/conptydevice.h
        lib/win32_compat.h
    )
else()
    list(APPEND QMLTERMWIDGET_SOURCES
        lib/kpty.cpp
        lib/kptydevice.cpp
        lib/kptyprocess.cpp
    )
    list(APPEND QMLTERMWIDGET_HEADERS
        lib/kptydevice.h
        lib/kpty.h
        lib/kpty_p.h
        lib/kptyprocess.h
    )
endif()

add_library(qmltermwidget SHARED ${QMLTERMWIDGET_SOURCES} ${QMLTERMWIDGET_HEADERS})

target_compile_definitions(qmltermwidget PRIVATE QTERMWIDGET_LIBRARY)

if(WIN32)
    target_compile_definitions(qmltermwidget PRIVATE _WIN32_WINNT=0x0A00 NTDDI_VERSION=0x0A000006)
elseif(UNIX AND NOT APPLE)
    target_compile_definitions(qmltermwidget PRIVATE HAVE_POSIX_OPENPT HAVE_SYS_TIME_H)
elseif(APPLE)
    target_compile_definitions(qmltermwidget PRIVATE HAVE_UTMPX _UTMPX_COMPAT HAVE_PTSNAME HAVE_UNLOCKPT HAVE_GRANTPT)
endif()

target_include_directories(qmltermwidget PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/lib
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(qmltermwidget PRIVATE
    Qt6::Core
    Qt6::Quick
    Qt6::Widgets
    Qt6::Network
)

if(WIN32)
    target_link_libraries(qmltermwidget PRIVATE kernel32 user32 advapi32 psapi)
endif()

set(PLUGIN_DEST_DIR "${CMAKE_BINARY_DIR}/QMLTermWidget")

add_custom_target(qmltermwidget_assets ALL
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${CMAKE_CURRENT_SOURCE_DIR}/lib/color-schemes" "${PLUGIN_DEST_DIR}/color-schemes"
    COMMAND ${CMAKE_COMMAND} -E copy_directory "${CMAKE_CURRENT_SOURCE_DIR}/lib/kb-layouts" "${PLUGIN_DEST_DIR}/kb-layouts"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different "${CMAKE_CURRENT_SOURCE_DIR}/src/qmldir" "${PLUGIN_DEST_DIR}/qmldir"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different "${CMAKE_CURRENT_SOURCE_DIR}/src/QMLTermScrollbar.qml" "${PLUGIN_DEST_DIR}/QMLTermScrollbar.qml"
)

if(QT_INSTALL_QML)
    set(QML_INSTALL_DIR "${QT_INSTALL_QML}/QMLTermWidget")
else()
    set(QML_INSTALL_DIR "lib/qt6/qml/QMLTermWidget")
endif()

install(TARGETS qmltermwidget DESTINATION ${QML_INSTALL_DIR})
install(FILES src/qmldir src/QMLTermScrollbar.qml DESTINATION ${QML_INSTALL_DIR})
install(DIRECTORY lib/color-schemes/ DESTINATION ${QML_INSTALL_DIR}/color-schemes)
install(DIRECTORY lib/kb-layouts/ DESTINATION ${QML_INSTALL_DIR}/kb-layouts)
