class testEmitter {
    constructor(destination) {
        this.destination = destination
    }

    async emitter(events) {
        let observe = []
        const failedEvents = []
        const startTime = Date.now()
        observe.push({
            eventTime: startTime,
            eventType: 'initFunction',
            msgLevel: 'info',
            functionName: 'event-emitter-test'
        })
        // console.log(`submitted events: ${events}`)
        try {
            const emitterName = this.constructor.name
            let numEvents = events.length
            for (let i = 0; i < numEvents; i++) {
                const emitResponse = await this.destination(events[i])
                observe = observe.concat(emitResponse.observe)
                if (!emitResponse.response) {
                    events[i]['eventRoute'] = emitterName
                    // console.log(events[i])
                    failedEvents = failedEvents.push(events[i])
                }
            }
        } catch (error) {
            observe.push({
                eventTime: Date.now(),
                eventType: 'stackError',
                msgLevel: 'error',
                message: error.message,
                stack: error.stack,
                functionName: 'event-emitter-test'
            })
        } finally {
            const endTime = Date.now()
            observe.push({
                eventTime: endTime,
                eventType: 'endFunction',
                msgLevel: 'info',
                duration: endTime - startTime,
                functionName: 'event-emitter-test'
            })
        }
        return {
            observe,
            failedEvents
        }
    }
}

export default testEmitter