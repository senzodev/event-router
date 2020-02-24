const errorMatch = observe => {
    const findError = observe.filter(element => {
        return element
            ? element.msgLevel
                ? element.msgLevel === 'error'
                : true
            : true
    })
    return findError.length > 0
}

export default errorMatch
