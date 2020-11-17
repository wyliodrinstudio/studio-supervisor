FROM ubuntu:20.04

WORKDIR /wyliodrin
ENV HOME=/wyliodrin

# install python3 and build tools
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-dev build-essential curl openocd git gcc-arm-none-eabi libnewlib-arm-none-eabi
# install nodejs
RUN curl https://nodejs.org/dist/v12.18.4/node-v12.18.4-linux-x64.tar.xz -sSf | tar xvJ &&\
    cd node* && cp -R * /usr && cd .. && rm -rf node* && node -v

# install rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

# install tockloader
RUN git clone https://github.com/tock/tockloader.git
RUN cd tockloader && python3 setup.py install

# install tock os
RUN git clone https://github.com/tock/tock.git
RUN git clone https://github.com/tock/libtock-c.git

# install studio-supervisor
COPY . /wyliodrin/studio-supervisor
RUN cd studio-supervisor && npm install 

#install jlink
RUN if test -f /wyliodrin/studio-supervisor/dependecies/JLink_Linux_V*f_*.deb; then apt install -y /wyliodrin/studio-supervisor/dependecies/JLink_Linux_V*f_*.deb; else echo -e "\n\n\t\e[31m!!!\e[0mInstaller package for JLink is missing, please visit \e[31mhttps://www.segger.com/downloads/jlink/JLink_Linux_x86_64.deb\e[0m, download it and add it to the dependecies folder if you want to use the Nordic devices.\n\n"; fi 

ENV TOCK_DIR=/wyliodrin/tock
ENV PATH="${PATH}:/${HOME}/.cargo/bin"

CMD cd /wyliodrin/studio-supervisor/source && node startup.js tockos
