FROM ubuntu:20.04

WORKDIR /wyliodrin

# install python3 and build tools
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip build-essential curl openocd git gcc-arm-none-eabi

# install nodejs
RUN curl https://nodejs.org/dist/v12.18.4/node-v12.18.4-linux-x64.tar.xz -sSf | tar xvJ &&\
    cd node* && cp -R * /usr && cd .. && rm -rf node* && node -v

# install rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
RUN pip3 install --upgrade tockloader

# install tock os
RUN git clone https://github.com/tock/tock.git
RUN git clone https://github.com/tock/libtock-c.git

# install studio-supervisor
COPY . /wyliodrin/studio-supervisor
RUN cd studio-supervisor npm install

CMD cd /wyliodrin/studio-supervisor/source && node startup.js tockos
