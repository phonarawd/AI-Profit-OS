if [ -x /opt/render/project/src/node ]; then
  case ":$PATH:" in
    *":/opt/render/project/src:"*) ;;
    *) export PATH="/opt/render/project/src:$PATH" ;;
  esac
fi
